// generator.js – turns a block workspace into NXC source code for the NBC compiler.
//
//   const generate = createNxcGenerator(Blockly);
//   const { code, lineToBlock, problems } = generate(workspace);
//
// code        – the NXC program as text
// lineToBlock – Map: line number in `code` → id of the block that produced it (to point at errors)
// problems    – [{ blockId, message }] things we can already tell are wrong before compiling

const ORDER = { ATOMIC: 0, UNARY: 4, MULTIPLY: 5, ADD: 6, RELATIONAL: 8, EQUALITY: 9, AND: 13, OR: 14, NONE: 99 };
const MARK = " //#"; // invisible-to-the-user marker: "this line came from block <id>"

const SENSOR_SETUP = { touch: "SetSensorTouch", light: "SetSensorLight", sound: "SetSensorSound", distance: "SetSensorLowspeed" };
const SENSOR_NAMES = { touch: "touch sensor", light: "light sensor", sound: "sound sensor", distance: "ultrasonic sensor" };

export function createNxcGenerator(Blockly) {
  const G = new Blockly.CodeGenerator("NXC");
  G.INDENT = "  ";
  G.addReservedWords(
    "task,main,int,long,float,short,byte,bool,char,string,unsigned,const,void,return,if,else,while,do,for,repeat,until," +
    "switch,case,default,break,continue,start,stop,priority,mutex,struct,typedef,inline,safecall,sub,true,false,asm,goto",
  );

  let state; // reset for every generate() call

  // ------------------------------------------------------------ helpers

  const isNumber = (code) => /^-?\d+(\.\d+)?$/.test(code);
  const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
  const value = (block, name, order = ORDER.NONE, fallback = "0") => G.valueToCode(block, name, order) || fallback;

  // seconds (may be a decimal or an expression) → milliseconds for Wait()
  function milliseconds(block, name) {
    const seconds = value(block, name, ORDER.MULTIPLY);
    return isNumber(seconds) ? String(Math.max(0, Math.round(Number(seconds) * 1000))) : `${seconds} * 1000`;
  }

  // Motor power: forward keeps the sign, backward flips it. Literals are clamped to what the NXT accepts.
  function power(block, name, backward = false) {
    const p = value(block, name, ORDER.UNARY);
    if (isNumber(p)) return String(clamp(Math.round(Number(p)), -100, 100) * (backward ? -1 : 1));
    return backward ? `-(${p})` : p;
  }

  function useSensor(block, kind) {
    const port = block.getFieldValue("PORT");
    const already = state.sensors.get(port);
    if (already && already !== kind) {
      state.problems.push({ blockId: block.id, message: `Port ${port} is used as a ${SENSOR_NAMES[already]} and as a ${SENSOR_NAMES[kind]}. Pick a different port for one of them.` });
    } else {
      state.sensors.set(port, kind);
    }
    return `S${port}`;
  }

  // A loop body must never be completely empty *and* never spin without a pause: a short Wait keeps
  // other tasks and the brick's buttons responsive.
  const loopBody = (block, name) => G.statementToCode(block, name) + G.INDENT + "Wait(1);\n";

  // ------------------------------------------------------------ how blocks chain together

  // Called for every block: add the "which block made this line" marker and the code of the next block.
  G.scrub_ = function (block, code, thisOnly) {
    if (!block.outputConnection && code) {
      const firstLineEnd = code.indexOf("\n");
      code = code.slice(0, firstLineEnd) + MARK + block.id + code.slice(firstLineEnd);
    }
    const next = block.nextConnection?.targetBlock();
    return code + (next && !thisOnly ? G.blockToCode(next) : "");
  };

  // ------------------------------------------------------------ blocks

  const B = G.forBlock;
  B.nxt_start = () => "";

  B.nxt_motor_on = (b) => `OnFwd(OUT_${b.getFieldValue("PORT")}, ${power(b, "POWER", b.getFieldValue("DIR") === "rev")});\n`;
  B.nxt_motor_for = (b) => {
    const out = `OUT_${b.getFieldValue("PORT")}`;
    const p = power(b, "POWER", b.getFieldValue("DIR") === "rev");
    if (b.getFieldValue("UNIT") === "s") return `OnFwd(${out}, ${p});\nWait(${milliseconds(b, "AMOUNT")});\nOff(${out});\n`;
    const amount = value(b, "AMOUNT", ORDER.MULTIPLY);
    const degrees = b.getFieldValue("UNIT") === "deg" ? amount : isNumber(amount) ? String(Math.round(Number(amount) * 360)) : `${amount} * 360`;
    return `RotateMotor(${out}, ${p}, ${degrees});\n`;
  };
  B.nxt_motor_stop = (b) => `Off(OUT_${b.getFieldValue("PORT")});\n`;

  B.nxt_move_for = (b) => {
    const p = power(b, "POWER", b.getFieldValue("DIR") === "rev");
    if (b.getFieldValue("UNIT") === "s") return `OnFwdSync(OUT_BC, ${p}, 0);\nWait(${milliseconds(b, "AMOUNT")});\nOff(OUT_BC);\n`;
    const amount = value(b, "AMOUNT", ORDER.MULTIPLY);
    const degrees = isNumber(amount) ? String(Math.round(Number(amount) * 360)) : `${amount} * 360`;
    return `RotateMotorEx(OUT_BC, ${p}, ${degrees}, 0, true, true);\n`;
  };
  B.nxt_move_start = (b) => `OnFwd(OUT_B, ${power(b, "LEFT")});\nOnFwd(OUT_C, ${power(b, "RIGHT")});\n`;
  B.nxt_turn_for = (b) => {
    const left = b.getFieldValue("SIDE") === "left";
    return `OnFwd(OUT_B, ${power(b, "POWER", left)});\nOnFwd(OUT_C, ${power(b, "POWER", !left)});\nWait(${milliseconds(b, "SECONDS")});\nOff(OUT_BC);\n`;
  };
  B.nxt_move_stop = () => "Off(OUT_BC);\n";

  // PlayTone returns at once, so wait for the same time or the next note would cut this one off.
  const tone = (hz, ms) => `PlayTone(${hz}, ${ms});\nWait(${ms});\n`;
  B.nxt_beep = (b) => tone(b.getFieldValue("NOTE"), milliseconds(b, "SECONDS"));
  B.nxt_tone = (b) => tone(value(b, "HZ", ORDER.NONE, "440"), milliseconds(b, "SECONDS"));

  B.nxt_show_text = (b) => {
    const line = `LCD_LINE${b.getFieldValue("LINE")}`;
    // The display is 16 characters wide; escape what would end the NXC string early.
    const text = b.getFieldValue("TEXT").slice(0, 16).replace(/[\\"]/g, "\\$&");
    return `ClearLine(${line});\nTextOut(0, ${line}, "${text}");\n`;
  };
  B.nxt_show_number = (b) => {
    const line = `LCD_LINE${b.getFieldValue("LINE")}`;
    return `ClearLine(${line});\nNumOut(0, ${line}, ${value(b, "VALUE")});\n`;
  };
  B.nxt_clear_screen = () => "ClearScreen();\n";

  B.nxt_wait = (b) => `Wait(${milliseconds(b, "SECONDS")});\n`;
  B.nxt_repeat = (b) => `repeat (${value(b, "TIMES")}) {\n${G.statementToCode(b, "DO")}}\n`;
  B.nxt_forever = (b) => `while (true) {\n${loopBody(b, "DO")}}\n`;
  B.nxt_if = (b) => `if (${value(b, "IF", ORDER.NONE, "false")}) {\n${G.statementToCode(b, "DO")}}\n`;
  B.nxt_if_else = (b) => `if (${value(b, "IF", ORDER.NONE, "false")}) {\n${G.statementToCode(b, "DO")}} else {\n${G.statementToCode(b, "ELSE")}}\n`;
  B.nxt_wait_until = (b) => `until (${value(b, "UNTIL", ORDER.NONE, "true")}) {\n${G.INDENT}Wait(5);\n}\n`;
  B.nxt_repeat_until = (b) => `until (${value(b, "UNTIL", ORDER.NONE, "true")}) {\n${loopBody(b, "DO")}}\n`;
  B.nxt_stop_program = () => "Off(OUT_ABC);\nStopAllTasks();\n";

  B.nxt_touch_pressed = (b) => [`Sensor(${useSensor(b, "touch")}) == 1`, ORDER.EQUALITY];
  B.nxt_light = (b) => [`Sensor(${useSensor(b, "light")})`, ORDER.ATOMIC];
  B.nxt_sound_level = (b) => [`Sensor(${useSensor(b, "sound")})`, ORDER.ATOMIC];
  B.nxt_distance = (b) => [`SensorUS(${useSensor(b, "distance")})`, ORDER.ATOMIC];
  B.nxt_rotation = (b) => [`MotorRotationCount(OUT_${b.getFieldValue("PORT")})`, ORDER.ATOMIC];
  B.nxt_reset_rotation = (b) => `ResetRotationCount(OUT_${b.getFieldValue("PORT")});\n`;
  B.nxt_button_pressed = (b) => [`ButtonPressed(${b.getFieldValue("BUTTON")}, false)`, ORDER.ATOMIC];
  B.nxt_timer = () => { state.usesTimer = true; return ["(CurrentTick() - __timerStart) / 1000.0", ORDER.MULTIPLY]; };
  B.nxt_reset_timer = () => { state.usesTimer = true; return "__timerStart = CurrentTick();\n"; };

  B.math_number = (b) => {
    const n = Number(b.getFieldValue("NUM"));
    return [String(n), n < 0 ? ORDER.UNARY : ORDER.ATOMIC];
  };
  B.nxt_math = (b) => {
    const op = b.getFieldValue("OP");
    const order = op === "+" || op === "-" ? ORDER.ADD : ORDER.MULTIPLY;
    // One level tighter on the right side, so that 10 − (3 − 2) keeps its brackets.
    return [`${value(b, "A", order)} ${op} ${value(b, "B", order - 1)}`, order];
  };
  B.nxt_compare = (b) => {
    const op = b.getFieldValue("OP");
    const order = op === "==" || op === "!=" ? ORDER.EQUALITY : ORDER.RELATIONAL;
    return [`${value(b, "A", order - 1)} ${op} ${value(b, "B", order - 1)}`, order];
  };
  B.nxt_logic = (b) => {
    const op = b.getFieldValue("OP");
    // Always bracket both sides: "a && b || c" is hard to read for everybody.
    return [`(${value(b, "A", ORDER.NONE, "false")}) ${op} (${value(b, "B", ORDER.NONE, "false")})`, op === "&&" ? ORDER.AND : ORDER.OR];
  };
  B.nxt_not = (b) => [`!(${value(b, "A", ORDER.NONE, "false")})`, ORDER.UNARY];
  B.nxt_boolean = (b) => [b.getFieldValue("VALUE"), ORDER.ATOMIC];
  B.nxt_random = (b) => {
    const from = value(b, "FROM", ORDER.ADD), to = value(b, "TO", ORDER.ADD);
    if (isNumber(from) && isNumber(to)) {
      const low = Math.round(Math.min(from, to)), high = Math.round(Math.max(from, to));
      return [`Random(${high - low + 1}) + ${low}`, ORDER.ADD];
    }
    return [`Random(${to} - ${from} + 1) + ${from}`, ORDER.ADD];
  };

  B.variables_get = (b) => [G.getVariableName(b.getFieldValue("VAR")), ORDER.ATOMIC];
  B.variables_set = (b) => `${G.getVariableName(b.getFieldValue("VAR"))} = ${value(b, "VALUE")};\n`;
  B.math_change = (b) => `${G.getVariableName(b.getFieldValue("VAR"))} += ${value(b, "DELTA")};\n`;

  // ------------------------------------------------------------ whole program

  return function generate(workspace) {
    state = { sensors: new Map(), problems: [], usesTimer: false };
    G.nameDB_ = new Blockly.Names(G.RESERVED_WORDS_);
    G.nameDB_.setVariableMap(workspace.getVariableMap());
    G.init(workspace);

    const starts = workspace.getTopBlocks(true).filter((b) => b.type === "nxt_start" && b.isEnabled());
    if (starts.length === 0) state.problems.push({ blockId: null, message: 'Add a "when program starts" block and attach your blocks below it.' });
    const bodies = starts.map((start) => (start.getNextBlock() ? G.blockToCode(start.getNextBlock()) : ""));

    const variables = Blockly.Variables.allUsedVarModels(workspace).map((v) => `float ${G.getVariableName(v.getId())};`);
    if (state.usesTimer) variables.push("long __timerStart;");

    const setup = [...state.sensors].sort().map(([port, kind]) => `${SENSOR_SETUP[kind]}(S${port});\n`).join("")
      + (state.usesTimer ? "__timerStart = CurrentTick();\n" : "");

    let program = "// Made with MindBrick blocks\n" + (variables.length ? variables.join("\n") + "\n" : "") + "\n";
    if (bodies.length <= 1) {
      program += `task main()\n{\n${G.prefixLines(setup + (bodies[0] ?? ""), G.INDENT)}}\n`;
    } else {
      // Several "when program starts" stacks run side by side, each as its own task.
      const names = bodies.map((_, i) => `stack${i + 1}`);
      bodies.forEach((body, i) => { program += `task ${names[i]}()\n{\n${G.prefixLines(body, G.INDENT)}}\n\n`; });
      program += `task main()\n{\n${G.prefixLines(setup + `Precedes(${names.join(", ")});\n`, G.INDENT)}}\n`;
    }

    // Take the markers out again and remember which line belongs to which block.
    const lineToBlock = new Map();
    const code = program.split("\n").map((line, i) => {
      const at = line.indexOf(MARK);
      if (at < 0) return line;
      lineToBlock.set(i + 1, line.slice(at + MARK.length));
      return line.slice(0, at);
    }).join("\n");

    return { code, lineToBlock, problems: state.problems };
  };
}

// NBC reports some errors a line late, so look upwards for the nearest line that has a block.
export function blockForLine(lineToBlock, line) {
  for (let l = line; l >= 1 && l > line - 6; l--) if (lineToBlock.has(l)) return lineToBlock.get(l);
  return null;
}
