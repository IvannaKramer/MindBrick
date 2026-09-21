// examples.js – small ready-made programs for the "Examples" menu.
// Each example is a function of the language, because some contain text for the display.

const num = (value) => ({ shadow: { type: "math_number", fields: { NUM: value } } });
const inside = (block) => ({ block });
// chain(a, b, c) → a, then b below it, then c
const chain = (...blocks) => blocks.reduceRight((next, b) => ({ ...b, ...(next ? { next: { block: next } } : {}) }), null);
const program = (...blocks) => ({ blocks: { languageVersion: 0, blocks: [{ ...chain({ type: "nxt_start" }, ...blocks), x: 40, y: 40 }] } });

const move = (dir, power, amount, unit = "rot") => ({ type: "nxt_move_for", fields: { DIR: dir, UNIT: unit }, inputs: { POWER: num(power), AMOUNT: num(amount) } });
const turn = (side, power, seconds) => ({ type: "nxt_turn_for", fields: { SIDE: side }, inputs: { POWER: num(power), SECONDS: num(seconds) } });
const drive = (left, right) => ({ type: "nxt_move_start", inputs: { LEFT: num(left), RIGHT: num(right) } });
const note = (hz, seconds) => ({ type: "nxt_beep", fields: { NOTE: String(hz) }, inputs: { SECONDS: num(seconds) } });
const text = (value, line) => ({ type: "nxt_show_text", fields: { TEXT: value, LINE: String(line) } });
const sensor = (type, port) => inside({ type, fields: { PORT: String(port) } });
const compare = (a, op, b) => inside({ type: "nxt_compare", fields: { OP: op }, inputs: { A: a, B: num(b) } });
const forever = (...body) => ({ type: "nxt_forever", inputs: { DO: inside(chain(...body)) } });
const ifElse = (condition, yes, no) => ({ type: "nxt_if_else", inputs: { IF: condition, DO: inside(chain(...yes)), ELSE: inside(chain(...no)) } });

const [C, D, E, F, G] = [262, 294, 330, 349, 392];

export const EXAMPLES = [
  {
    id: "square",
    name: { en: "Drive a square", de: "Im Quadrat fahren" },
    build: () => program(
      { type: "nxt_repeat", inputs: { TIMES: num(4), DO: inside(chain(move("fwd", 50, 2), turn("right", 40, 0.6))) } },
      note(523, 0.5),
    ),
  },
  {
    id: "obstacle",
    name: { en: "Avoid obstacles (ultrasonic on port 4)", de: "Hindernissen ausweichen (Ultraschall an Port 4)" },
    build: () => program(forever(
      ifElse(compare(sensor("nxt_distance", 4), "<", 20), [move("rev", 50, 1), turn("left", 40, 0.5)], [drive(50, 50)]),
    )),
  },
  {
    id: "line",
    name: { en: "Follow a line (light sensor on port 3)", de: "Einer Linie folgen (Lichtsensor an Port 3)" },
    build: () => program(forever(
      ifElse(compare(sensor("nxt_light", 3), "<", 45), [drive(50, 10)], [drive(10, 50)]),
    )),
  },
  {
    id: "clap",
    name: { en: "Clap to start (sound sensor on port 2)", de: "Klatschen zum Losfahren (Geräuschsensor an Port 2)" },
    build: (language) => program(
      text(language === "de" ? "Klatsch!" : "Clap!", 1),
      { type: "nxt_wait_until", inputs: { UNTIL: compare(sensor("nxt_sound_level", 2), ">", 60) } },
      move("fwd", 60, 3),
      note(440, 0.3),
    ),
  },
  {
    id: "melody",
    name: { en: "Play a melody", de: "Eine Melodie spielen" },
    build: () => program(...[C, D, E, C, C, D, E, C, E, F].map((hz) => note(hz, 0.3)), note(G, 0.6)),
  },
];
