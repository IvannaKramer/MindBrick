// nxt.js – talk to a LEGO Mindstorms NXT (stock firmware) from the browser.
//
// Two layers:
//   1. Transports move raw command packets ("telegrams") to the brick and back:
//        UsbTransport    – WebUSB, needs a USB cable
//        SerialTransport – Web Serial, used for Bluetooth (pair the brick in the OS settings first)
//   2. Brick turns friendly calls like brick.playTone(880, 300) into telegrams.
//
// Protocol reference: LEGO "Bluetooth Developer Kit" documents and the nxt-python project.
// Not affiliated with or endorsed by the LEGO Group.

const NXT_VENDOR_ID = 0x0694;
const NXT_PRODUCT_ID = 0x0002;

// ---------------------------------------------------------------- transports

export class UsbTransport {
  name = "USB";
  maxData = 60; // biggest file chunk per packet (USB packets are 64 bytes, 4 are header)

  constructor(device) {
    this.device = device;
  }

  // Shows the browser's device chooser. Must be called from a click handler.
  static async request() {
    const device = await navigator.usb.requestDevice({
      filters: [{ vendorId: NXT_VENDOR_ID, productId: NXT_PRODUCT_ID }],
    });
    return new UsbTransport(device);
  }

  async open() {
    const d = this.device;
    await d.open();
    if (d.configuration === null) await d.selectConfiguration(1);
    const iface = d.configuration.interfaces[0];
    await d.claimInterface(iface.interfaceNumber);
    // The NXT has one "out" and one "in" bulk endpoint; look them up instead of hard-coding.
    const endpoints = iface.alternate.endpoints;
    this.epOut = endpoints.find((e) => e.direction === "out").endpointNumber;
    this.epIn = endpoints.find((e) => e.direction === "in").endpointNumber;
  }

  async send(bytes) {
    await this.device.transferOut(this.epOut, bytes);
  }

  async receive() {
    const result = await this.device.transferIn(this.epIn, 64);
    return new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.byteLength);
  }

  async close() {
    await this.device.close();
  }
}

export class SerialTransport {
  name = "Bluetooth";
  maxData = 118;

  constructor(port) {
    this.port = port;
    this.buffer = new Uint8Array(0); // bytes received but not yet used
  }

  // Shows the browser's port chooser. Must be called from a click handler.
  // The brick must already be paired in the operating system's Bluetooth settings.
  static async request() {
    const port = await navigator.serial.requestPort();
    return new SerialTransport(port);
  }

  async open() {
    // baudRate is required by the API but has no meaning for Bluetooth.
    await this.port.open({ baudRate: 115200 });
    this.reader = this.port.readable.getReader();
    this.writer = this.port.writable.getWriter();
  }

  // Over Bluetooth every packet starts with its length (2 bytes, low byte first).
  async send(bytes) {
    const packet = new Uint8Array(bytes.length + 2);
    packet[0] = bytes.length & 0xff;
    packet[1] = bytes.length >> 8;
    packet.set(bytes, 2);
    await this.writer.write(packet);
  }

  async receive() {
    const header = await this.#readExactly(2);
    return this.#readExactly(header[0] | (header[1] << 8));
  }

  // A serial port is a stream: bytes can arrive in pieces, so collect until we have enough.
  async #readExactly(count) {
    while (this.buffer.length < count) {
      const { value, done } = await this.reader.read();
      if (done) throw new Error("Connection closed by the brick");
      const joined = new Uint8Array(this.buffer.length + value.length);
      joined.set(this.buffer);
      joined.set(value, this.buffer.length);
      this.buffer = joined;
    }
    const wanted = this.buffer.slice(0, count);
    this.buffer = this.buffer.slice(count);
    return wanted;
  }

  async close() {
    this.reader.releaseLock();
    this.writer.releaseLock();
    await this.port.close();
  }
}

// ---------------------------------------------------------------- brick

const DIRECT = 0x00; // "direct" commands: motors, sensors, sound, start/stop program
const SYSTEM = 0x01; // "system" commands: files, firmware info
const REPLY = 0x02;

const ERRORS = {
  0x20: "Pending communication transaction in progress",
  0x40: "Mailbox queue is empty",
  0x81: "No more handles",
  0x82: "No space left on the brick",
  0x83: "No more files",
  0x87: "File not found",
  0x89: "No linear space – free some memory on the brick",
  0x8b: "File is busy",
  0x8f: "File already exists",
  0x92: "Illegal file name",
  0x93: "Illegal handle",
  0xbd: "Request failed (for example: file not found)",
  0xbe: "Unknown command",
  0xbf: "Insane packet",
  0xc0: "Value out of range",
  0xec: "No active program",
  0xfb: "Insufficient memory available",
  0xff: "Bad arguments",
};

export class NxtError extends Error {
  constructor(status) {
    super(ERRORS[status] ?? `Brick reported error 0x${status.toString(16)}`);
    this.status = status;
  }
}

// File names on the NXT: at most 15 characters, a dot, and a 3 letter extension.
// They are sent as exactly 20 bytes, padded with zeros.
function filenameBytes(name) {
  if (!/^[\x20-\x7e]{1,15}\.[A-Za-z]{3}$/.test(name)) {
    throw new Error(`"${name}" is not a valid NXT file name (max 15 characters + .ext)`);
  }
  const bytes = new Uint8Array(20);
  for (let i = 0; i < name.length; i++) bytes[i] = name.charCodeAt(i);
  return bytes;
}

function text(bytes) {
  const end = bytes.indexOf(0);
  return String.fromCharCode(...bytes.slice(0, end < 0 ? bytes.length : end));
}

const u16 = (b, i) => b[i] | (b[i + 1] << 8);
const u32 = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;

export class Brick {
  constructor(transport) {
    this.transport = transport;
    this.queue = Promise.resolve(); // commands run one after another, never interleaved
  }

  async connect() {
    await this.transport.open();
  }

  async disconnect() {
    await this.transport.close();
  }

  // Send one command and wait for its reply. Returns the reply bytes after the status byte.
  #command(type, opcode, ...parts) {
    const run = async () => {
      const length = parts.reduce((n, p) => n + p.length, 0);
      const telegram = new Uint8Array(2 + length);
      telegram[0] = type;
      telegram[1] = opcode;
      let at = 2;
      for (const p of parts) {
        telegram.set(p, at);
        at += p.length;
      }
      await this.transport.send(telegram);
      const reply = await this.transport.receive();
      if (reply[0] !== REPLY || reply[1] !== opcode) throw new Error("Unexpected reply from brick");
      if (reply[2] !== 0) throw new NxtError(reply[2]);
      return reply.slice(3);
    };
    const result = this.queue.then(run);
    this.queue = result.catch(() => {});
    return result;
  }

  // --- direct commands

  async playTone(frequencyHz, durationMs) {
    await this.#command(DIRECT, 0x03, [frequencyHz & 0xff, frequencyHz >> 8, durationMs & 0xff, durationMs >> 8]);
  }

  async batteryMillivolts() {
    return u16(await this.#command(DIRECT, 0x0b), 0);
  }

  async startProgram(name) {
    await this.#command(DIRECT, 0x00, filenameBytes(name));
  }

  async stopProgram() {
    await this.#command(DIRECT, 0x01);
  }

  // --- system commands

  async deviceInfo() {
    const r = await this.#command(SYSTEM, 0x9b);
    const address = [...r.slice(15, 21)].map((b) => b.toString(16).padStart(2, "0")).join(":");
    return { name: text(r.slice(0, 15)), bluetoothAddress: address.toUpperCase(), freeFlash: u32(r, 26) };
  }

  async firmwareVersion() {
    const r = await this.#command(SYSTEM, 0x88);
    return `${r[3]}.${String(r[2]).padStart(2, "0")}`;
  }

  async listFiles(pattern = "*.*") {
    const files = [];
    let r;
    try {
      r = await this.#command(SYSTEM, 0x86, filenameBytesLoose(pattern)); // find first
    } catch (e) {
      if (e.status === 0x87) return files; // nothing matches
      throw e;
    }
    const handle = r[0];
    try {
      for (;;) {
        files.push({ name: text(r.slice(1, 21)), size: u32(r, 21) });
        try {
          r = await this.#command(SYSTEM, 0x87, [handle]); // find next
        } catch (e) {
          if (e.status === 0x87) return files; // end of list
          throw e;
        }
      }
    } finally {
      await this.#command(SYSTEM, 0x84, [handle]).catch(() => {}); // always give the handle back
    }
  }

  async deleteFile(name) {
    await this.#command(SYSTEM, 0x85, filenameBytes(name));
  }

  // Store a file on the brick. An existing file with the same name is replaced.
  async uploadFile(name, data, onProgress = () => {}) {
    const nameBytes = filenameBytes(name);
    try {
      await this.deleteFile(name);
    } catch (e) {
      if (e.status !== 0x87) throw e; // "file not found" is fine
    }
    const size = [data.length & 0xff, (data.length >> 8) & 0xff, (data.length >> 16) & 0xff, data.length >>> 24];
    // The firmware stores .rxe files in one continuous piece by itself, as programs require.
    const [handle] = await this.#command(SYSTEM, 0x81, nameBytes, size);
    try {
      for (let at = 0; at < data.length; at += this.transport.maxData) {
        await this.#command(SYSTEM, 0x83, [handle], data.subarray(at, at + this.transport.maxData));
        onProgress(Math.min(at + this.transport.maxData, data.length), data.length);
      }
    } finally {
      await this.#command(SYSTEM, 0x84, [handle]);
    }
  }
}

// Search patterns like "*.rxe" are not valid file names, so skip the strict check for them.
function filenameBytesLoose(pattern) {
  const bytes = new Uint8Array(20);
  for (let i = 0; i < Math.min(pattern.length, 19); i++) bytes[i] = pattern.charCodeAt(i);
  return bytes;
}
