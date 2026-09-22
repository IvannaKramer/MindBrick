// mock-brick.js – a pretend NXT that answers the same commands as a real one.
// Used for the "Demo robot" (open the page with ?demo), for trying the app without hardware,
// for screenshots and for automated tests. It speaks the wire protocol, so nxt.js is used unchanged.

const name20 = (bytes) => { const end = bytes.indexOf(0); return String.fromCharCode(...bytes.slice(0, end < 0 ? 20 : end)); };
const bytes20 = (name) => { const b = new Uint8Array(20); [...name].forEach((c, i) => (b[i] = c.charCodeAt(0))); return [...b]; };
const le = (value, size) => Array.from({ length: size }, (_, i) => (value >> (8 * i)) & 0xff);

export class MockTransport {
  name = "Demo";
  maxData = 60;
  #reply = null;
  #name = "DemoBot";
  #files = new Map([["demo.rxe", new Uint8Array(1234)]]);
  #handles = new Map();
  #nextHandle = 1;
  #running = null; // { name, until }
  #sensors = [0, 0, 0, 0].map(() => ({ type: 0, mode: 0 }));
  #i2cReady = false;
  #started = Date.now();

  static async request() { return new MockTransport(); }
  static async known() { return []; }
  async open() {}
  async close() {}
  async send(bytes) { this.#reply = Uint8Array.from(this.#answer([...bytes])); }
  async receive() { await new Promise((r) => setTimeout(r, 15)); return this.#reply; }

  #program() {
    if (this.#running && Date.now() > this.#running.until) this.#running = null;
    return this.#running;
  }

  #answer(t) {
    const [kind, op] = t;
    const ok = (...rest) => [0x02, op, 0x00, ...rest];
    const fail = (status) => [0x02, op, status];
    const seconds = (Date.now() - this.#started) / 1000;
    const wave = (period, low, high) => Math.round(low + (high - low) * (0.5 + 0.5 * Math.sin((seconds / period) * 2 * Math.PI)));

    if (kind === 0x00) switch (op) { // direct commands
      case 0x00: { const name = name20(t.slice(2)); if (!this.#files.has(name)) return fail(0xbd); this.#running = { name, until: Date.now() + 8000 }; return ok(); }
      case 0x01: if (!this.#program()) return fail(0xec); this.#running = null; return ok();
      case 0x03: return ok();
      case 0x05: this.#sensors[t[2]] = { type: t[3], mode: t[4] }; return ok();
      case 0x06: return ok(t[2], 0, 0, 0, 0, 0, ...le(0, 4), ...le(0, 4), ...le(0, 4), ...le(Math.round(seconds * 30 * (t[2] + 1)), 4));
      case 0x07: {
        const { type, mode } = this.#sensors[t[2]];
        const value = type === 0x01 ? Number(wave(4, 0, 1) > 0.5) : type === 0x05 ? wave(7, 30, 65) : type === 0x07 ? wave(3, 5, 80) : 0;
        return ok(t[2], 1, 0, type, mode, ...le(value * 10, 2), ...le(value * 10, 2), ...le(value, 2), ...le(0, 2));
      }
      case 0x0b: return ok(...le(7800, 2));
      case 0x0e: return this.#i2cReady ? ok(1) : fail(0xdd);
      case 0x0f: this.#i2cReady = this.#sensors[t[2]].type === 0x0b; return this.#i2cReady ? ok() : fail(0xdd);
      case 0x10: return ok(1, wave(9, 8, 120), ...Array(15).fill(0));
      case 0x11: return this.#program() ? ok(...bytes20(this.#running.name)) : fail(0xec);
    }
    if (kind === 0x01) switch (op) { // system commands
      case 0x81: case 0x89: {
        const name = name20(t.slice(2, 22));
        if (this.#files.has(name)) return fail(0x8f);
        const handle = this.#nextHandle++;
        this.#handles.set(handle, { name, data: [] });
        return ok(handle);
      }
      case 0x83: this.#handles.get(t[2]).data.push(...t.slice(3)); return ok(t[2], ...le(t.length - 3, 2));
      case 0x84: { const h = this.#handles.get(t[2]); if (h?.data) this.#files.set(h.name, Uint8Array.from(h.data)); this.#handles.delete(t[2]); return ok(t[2]); }
      case 0x85: { const name = name20(t.slice(2)); return this.#files.delete(name) ? ok(...bytes20(name)) : fail(0x87); }
      case 0x86: case 0x87: {
        let handle = t[2], list;
        if (op === 0x86) {
          const pattern = name20(t.slice(2)).replace("*.*", "").replace("*", "");
          list = [...this.#files].filter(([name]) => name.endsWith(pattern));
          handle = this.#nextHandle++;
          this.#handles.set(handle, { list });
        } else list = this.#handles.get(handle)?.list ?? [];
        const next = list.shift();
        return next ? ok(handle, ...bytes20(next[0]), ...le(next[1].length, 4)) : fail(0x87);
      }
      case 0x88: return ok(124, 1, 31, 1);
      case 0x98: this.#name = name20(t.slice(2)); return ok();
      case 0x9b: return ok(...bytes20(this.#name).slice(0, 15), 0, 0x16, 0x53, 0, 0, 0, 0, ...le(0, 4), ...le(40000 - [...this.#files.values()].reduce((n, f) => n + f.length, 0), 4));
    }
    return fail(0xbe);
  }
}
