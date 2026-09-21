// Tests for nxt.js against a pretend brick. The reply layouts follow LEGO's
// "Direct Commands" and "Communication Protocol" documents (Bluetooth Developer Kit).
import test from "node:test";
import assert from "node:assert/strict";
import { Brick, NxtError } from "../web/nxt.js";

// A transport whose "brick" is a function: telegram bytes in → reply bytes out.
function pretendBrick(answer) {
  const sent = [];
  let reply;
  return {
    sent,
    transport: {
      maxData: 60,
      async open() {}, async close() {},
      async send(bytes) { sent.push([...bytes]); reply = Uint8Array.from(answer([...bytes])); },
      async receive() { return reply; },
    },
  };
}
const ok = (opcode, ...rest) => [0x02, opcode, 0x00, ...rest];
const fail = (opcode, status) => [0x02, opcode, status];
const name20 = (name) => [...name].map((c) => c.charCodeAt(0)).concat(Array(20 - name.length).fill(0));

test("upload: delete old file, open, write in chunks, close – and the bytes arrive complete", async () => {
  const data = Uint8Array.from({ length: 150 }, (_, i) => i);
  const received = [];
  const { sent, transport } = pretendBrick((t) => {
    if (t[1] === 0x85) return fail(0x85, 0x87); // nothing to delete
    if (t[1] === 0x81) return ok(0x81, 7); // handle 7
    if (t[1] === 0x83) { received.push(...t.slice(3)); return ok(0x83, 7, t.length - 3, 0); }
    return ok(t[1], 7);
  });
  const progress = [];
  await new Brick(transport).uploadFile("prog.rxe", data, (done, total) => progress.push(`${done}/${total}`));
  assert.deepEqual(sent.map((t) => t[1]), [0x85, 0x81, 0x83, 0x83, 0x83, 0x84]);
  assert.deepEqual(sent[1].slice(2, 22), name20("prog.rxe"));
  assert.deepEqual(sent[1].slice(22), [150, 0, 0, 0]);
  assert.ok(sent.every((t) => t.length <= 64), "USB packets must fit in 64 bytes");
  assert.deepEqual(received, [...data]);
  assert.deepEqual(progress, ["60/150", "120/150", "150/150"]);
});

test("upload closes the file handle even when a write fails", async () => {
  const { sent, transport } = pretendBrick((t) => (t[1] === 0x83 ? fail(0x83, 0x82) : ok(t[1], 3)));
  await assert.rejects(new Brick(transport).uploadFile("prog.rxe", new Uint8Array(10)), NxtError);
  assert.equal(sent.at(-1)[1], 0x84);
});

test("file names are checked before anything is sent", async () => {
  const { sent, transport } = pretendBrick(() => ok(0));
  await assert.rejects(new Brick(transport).startProgram("this-name-is-way-too-long.rxe"));
  assert.equal(sent.length, 0);
});

test("list files walks find-first/find-next and gives the handle back", async () => {
  const files = [["a.rxe", 540], ["b.rxe", 70000]];
  let i = 0;
  const entry = ([name, size]) => [9, ...name20(name), size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, 0];
  const { sent, transport } = pretendBrick((t) => {
    if (t[1] === 0x86) return ok(0x86, ...entry(files[i++]));
    if (t[1] === 0x87) return i < files.length ? ok(0x87, ...entry(files[i++])) : fail(0x87, 0x87);
    return ok(t[1], 9);
  });
  assert.deepEqual(await new Brick(transport).listFiles("*.rxe"), [{ name: "a.rxe", size: 540 }, { name: "b.rxe", size: 70000 }]);
  assert.deepEqual(sent.at(-1).slice(0, 3), [0x01, 0x84, 9]);
});

test("current program: name, or null when nothing runs", async () => {
  assert.equal(await new Brick(pretendBrick(() => ok(0x11, ...name20("prog.rxe"))).transport).currentProgram(), "prog.rxe");
  assert.equal(await new Brick(pretendBrick(() => fail(0x11, 0xec)).transport).currentProgram(), null);
});

test("sensor reading: scaled value, also negative", async () => {
  //                         port valid calib type mode  raw      normal   scaled     calibrated
  const reply = (scaled) => ok(0x07, 2, 1, 0, 0x05, 0x80, 0x10, 0x02, 0x20, 0x01, scaled & 0xff, (scaled >> 8) & 0xff, 0, 0);
  const { sent, transport } = pretendBrick(() => reply(47));
  assert.deepEqual(await new Brick(transport).readSensor(3), { type: 0x05, valid: true, value: 47 });
  assert.deepEqual(sent[0], [0x00, 0x07, 2], "port 3 is number 2 on the wire");
  assert.equal((await new Brick(pretendBrick(() => reply(-5)).transport).readSensor(3)).value, -5);
});

test("motor rotation is a signed 32-bit number at the end of the reply", async () => {
  const state = (rotation) => { const b = new Uint8Array(22); new DataView(b.buffer).setInt32(18, rotation, true); return ok(0x06, ...b); };
  assert.equal(await new Brick(pretendBrick(() => state(-725)).transport).motorRotation("B"), -725);
  const { sent, transport } = pretendBrick(() => state(100000));
  assert.equal(await new Brick(transport).motorRotation("C"), 100000);
  assert.deepEqual(sent[0], [0x00, 0x06, 2]);
});

test("ultrasonic distance: write, wait while the bus is busy, read", async () => {
  let polls = 0;
  const { sent, transport } = pretendBrick((t) => {
    if (t[1] === 0x0f) return ok(0x0f);
    if (t[1] === 0x0e) return ++polls < 3 ? fail(0x0e, 0x20) : ok(0x0e, 1);
    return ok(0x10, 1, 23, ...Array(15).fill(0));
  });
  assert.equal(await new Brick(transport).readDistance(4), 23);
  assert.deepEqual(sent[0], [0x00, 0x0f, 3, 2, 1, 0x02, 0x42]);
  assert.equal(polls, 3);
});
