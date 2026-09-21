// Tests for the block → NXC generator. Every generated program is really compiled with nbc.wasm.
//   npm install && npm test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as Blockly from "blockly";
import { defineBlocks, TOOLBOX, STARTER_WORKSPACE } from "../web/blocks.js";
import { createNxcGenerator, blockForLine } from "../web/generator.js";
import { createCompiler } from "../web/nbc.js";

defineBlocks(Blockly);
const generate = createNxcGenerator(Blockly);
const compile = await createCompiler(readFileSync(new URL("../web/nbc.wasm", import.meta.url)));

function workspaceFrom(json) {
  const ws = new Blockly.Workspace();
  Blockly.serialization.workspaces.load(json, ws);
  return ws;
}
const num = (n) => ({ shadow: { type: "math_number", fields: { NUM: n } } });
const program = (...stacks) => ({ blocks: { languageVersion: 0, blocks: stacks } });
// chain([a, b, c]) → a with next b with next c
const chain = (blocks) => blocks.reduceRight((next, b) => ({ ...b, ...(next ? { next: { block: next } } : {}) }), null);
const start = (...blocks) => chain([{ type: "nxt_start" }, ...blocks]);

async function mustCompile(code) {
  const result = await compile(code);
  assert.ok(result.ok, "NBC rejected the generated code:\n" + JSON.stringify(result.errors) + "\n" + code);
  return result;
}

test("starter program generates the expected code and compiles", async () => {
  const { code, problems } = generate(workspaceFrom(STARTER_WORKSPACE));
  assert.deepEqual(problems, []);
  assert.equal(code, `// Made with MindBrick blocks

task main()
{
  ClearLine(LCD_LINE1);
  TextOut(0, LCD_LINE1, "Hello!");
  PlayTone(440, 300);
  Wait(300);
  OnFwd(OUT_A, 50);
  Wait(1000);
  Off(OUT_A);
}
`);
  await mustCompile(code);
});

test("every block in the toolbox compiles, with its default values", async () => {
  const all = TOOLBOX.contents.flatMap((c) => c.contents ?? []).map(({ type, inputs }) => ({ type, ...(inputs ? { inputs } : {}) }));
  const ws0 = new Blockly.Workspace();
  const shape = (type) => { const b = ws0.newBlock(type); return { value: !!b.outputConnection, bool: b.outputConnection?.getCheck()?.includes("Boolean"), last: !b.outputConnection && !b.nextConnection }; };
  const statements = all.filter((b) => b.type !== "nxt_start" && !shape(b.type).value);
  const numbers = all.filter((b) => shape(b.type).value && !shape(b.type).bool);
  const booleans = all.filter((b) => shape(b.type).bool);
  assert.ok(statements.length > 15 && numbers.length >= 6 && booleans.length >= 5);

  // Use different ports per sensor type so the conflict check stays quiet.
  const ports = { nxt_touch_pressed: "1", nxt_sound_level: "2", nxt_light: "3", nxt_distance: "4" };
  const withPort = (b) => (ports[b.type] ? { ...b, fields: { PORT: ports[b.type] } } : b);
  const body = [
    ...statements.filter((b) => !shape(b.type).last),
    ...numbers.map((b) => ({ type: "nxt_show_number", fields: { LINE: "2" }, inputs: { VALUE: { block: withPort(b) } } })),
    ...booleans.map((b) => ({ type: "nxt_if", inputs: { IF: { block: withPort(b) } } })),
  ];
  const enders = statements.filter((b) => shape(b.type).last);
  const { code, problems, lineToBlock } = generate(workspaceFrom(program(start(...body, enders[0]), ...enders.slice(1).map((e) => start(e)))));
  assert.deepEqual(problems, []);
  assert.ok(lineToBlock.size > 20);
  await mustCompile(code);
});

test("variables, arithmetic with brackets, and expressions in every numeric socket", async () => {
  const v = (name) => ({ block: { type: "variables_get", fields: { VAR: { id: name } } } });
  const math = (a, op, b) => ({ block: { type: "nxt_math", fields: { OP: op }, inputs: { A: a, B: b } } });
  const json = program(start(
    { type: "variables_set", fields: { VAR: { id: "speed" } }, inputs: { VALUE: math(num(10), "-", math(num(3), "-", num(2))) } },
    { type: "math_change", fields: { VAR: { id: "task" } }, inputs: { DELTA: num(0.5) } },
    { type: "nxt_wait", inputs: { SECONDS: v("task") } },
    { type: "nxt_motor_for", fields: { PORT: "B", DIR: "rev", UNIT: "rot" }, inputs: { POWER: v("speed"), AMOUNT: math(v("task"), "*", num(2)) } },
    { type: "nxt_move_for", fields: { DIR: "rev", UNIT: "rot" }, inputs: { POWER: v("speed"), AMOUNT: v("task") } },
    { type: "nxt_turn_for", fields: { SIDE: "right" }, inputs: { POWER: v("speed"), SECONDS: v("task") } },
    { type: "nxt_tone", inputs: { HZ: math(v("speed"), "*", num(10)), SECONDS: v("task") } },
    { type: "nxt_repeat", inputs: { TIMES: math(v("task"), "+", num(2)) } },
    { type: "nxt_show_number", fields: { LINE: "3" }, inputs: { VALUE: { block: { type: "nxt_random", inputs: { FROM: v("task"), TO: v("speed") } } } } },
  ));
  json.variables = [{ name: "speed", id: "speed" }, { name: "task", id: "task" }]; // "task" is an NXC keyword
  const { code } = generate(workspaceFrom(json));
  assert.match(code, /^float speed;$/m);
  assert.doesNotMatch(code, /^float task;$/m, "reserved words must be renamed");
  assert.match(code, /speed = 10 - \(3 - 2\);/);
  await mustCompile(code);
});

test("two start blocks become two tasks", async () => {
  const { code } = generate(workspaceFrom(program(
    start({ type: "nxt_forever", inputs: { DO: { block: { type: "nxt_beep", fields: { NOTE: "262" }, inputs: { SECONDS: num(0.2) } } } } }),
    start({ type: "nxt_motor_on", fields: { PORT: "A", DIR: "fwd" }, inputs: { POWER: num(30) } }),
  )));
  assert.match(code, /Precedes\(stack1, stack2\);/);
  await mustCompile(code);
});

test("problems are reported: no start block, one port used for two sensor types", () => {
  assert.equal(generate(workspaceFrom(program({ type: "nxt_clear_screen" }))).problems.length, 1);
  const sensor = (type) => ({ type: "nxt_show_number", fields: { LINE: "1" }, inputs: { VALUE: { block: { type, fields: { PORT: "1" } } } } });
  const { problems } = generate(workspaceFrom(program(start(sensor("nxt_light"), sensor("nxt_distance")))));
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /Port 1/);
});

test("text is escaped and cut to the display width", async () => {
  const { code } = generate(workspaceFrom(program(start({ type: "nxt_show_text", fields: { TEXT: 'say "hi" \\ 1234567890', LINE: "1" } }))));
  assert.match(code, /TextOut\(0, LCD_LINE1, "say \\"hi\\" \\\\ 12345"\);/);
  await mustCompile(code);
});

test("error lines map back to blocks", () => {
  const { code, lineToBlock } = generate(workspaceFrom(STARTER_WORKSPACE));
  const line = code.split("\n").findIndex((l) => l.includes("Wait(1000)")) + 1;
  assert.ok(blockForLine(lineToBlock, line), "Wait(1000) belongs to the motor block");
  assert.equal(blockForLine(lineToBlock, 1), null);
});
