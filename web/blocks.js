// blocks.js – the MindBrick block set: what the blocks look like and how the toolbox is organised.
// What the blocks *do* lives in generator.js, so a different backend can reuse these definitions.
//
// All texts go through Blockly.Msg (see MESSAGES) so that translations only need a second table.

const COLOURS = {
  events: "#E0A100",
  motors: "#2F7DD1",
  movement: "#C9457F",
  sound: "#8A5BD0",
  display: "#1FA39A",
  control: "#EE8522",
  sensors: "#3A9F52",
  operators: "#5866CF",
};

export const MESSAGES = {
  en: {
    NXT_CAT_EVENTS: "Start",
    NXT_CAT_MOTORS: "Motors",
    NXT_CAT_MOVEMENT: "Movement",
    NXT_CAT_SOUND: "Sound",
    NXT_CAT_DISPLAY: "Display",
    NXT_CAT_CONTROL: "Control",
    NXT_CAT_SENSORS: "Sensors",
    NXT_CAT_OPERATORS: "Operators",
    NXT_CAT_VARIABLES: "Variables",

    NXT_START: "when program starts",
    NXT_MOTOR_ON: "start motor %1 %2 at %3 % power",
    NXT_MOTOR_FOR: "run motor %1 %2 at %3 % power for %4 %5",
    NXT_MOTOR_STOP: "stop motor %1",
    NXT_MOVE_FOR: "move %1 at %2 % power for %3 %4",
    NXT_MOVE_START: "start moving: left %1 % right %2 %",
    NXT_TURN_FOR: "turn %1 at %2 % power for %3 seconds",
    NXT_MOVE_STOP: "stop moving",
    NXT_BEEP: "play note %1 for %2 seconds",
    NXT_TONE: "play tone %1 Hz for %2 seconds",
    NXT_SHOW_TEXT: "show text %1 on line %2",
    NXT_SHOW_NUMBER: "show number %1 on line %2",
    NXT_CLEAR_SCREEN: "clear display",
    NXT_WAIT: "wait %1 seconds",
    NXT_REPEAT: "repeat %1 times",
    NXT_FOREVER: "forever",
    NXT_IF: "if %1 then",
    NXT_ELSE: "else",
    NXT_WAIT_UNTIL: "wait until %1",
    NXT_REPEAT_UNTIL: "repeat until %1",
    NXT_STOP_PROGRAM: "stop program",
    NXT_TOUCH_PRESSED: "touch sensor on port %1 pressed?",
    NXT_LIGHT: "light sensor on port %1 brightness %",
    NXT_DISTANCE: "ultrasonic sensor on port %1 distance cm",
    NXT_SOUND_LEVEL: "sound sensor on port %1 loudness %",
    NXT_ROTATION: "motor %1 rotation in degrees",
    NXT_RESET_ROTATION: "reset rotation of motor %1",
    NXT_BUTTON_PRESSED: "brick button %1 pressed?",
    NXT_TIMER: "timer in seconds",
    NXT_RESET_TIMER: "reset timer",
    NXT_RANDOM: "random number from %1 to %2",
    NXT_AND: "and",
    NXT_OR: "or",
    NXT_NOT: "not %1",
    NXT_TRUE: "true",
    NXT_FALSE: "false",

    NXT_FORWARD: "forward",
    NXT_BACKWARD: "backward",
    NXT_LEFT: "left",
    NXT_RIGHT: "right",
    NXT_SECONDS: "seconds",
    NXT_ROTATIONS: "rotations",
    NXT_DEGREES: "degrees",
    NXT_ALL: "all",
    NXT_BTN_ORANGE: "orange",
    NXT_BTN_LEFT: "left arrow",
    NXT_BTN_RIGHT: "right arrow",
    NXT_HELLO: "Hello!",
    NXT_NOTE_B: "B",
  },
  de: {
    NXT_CAT_EVENTS: "Start",
    NXT_CAT_MOTORS: "Motoren",
    NXT_CAT_MOVEMENT: "Bewegung",
    NXT_CAT_SOUND: "Klang",
    NXT_CAT_DISPLAY: "Anzeige",
    NXT_CAT_CONTROL: "Steuerung",
    NXT_CAT_SENSORS: "Sensoren",
    NXT_CAT_OPERATORS: "Operatoren",
    NXT_CAT_VARIABLES: "Variablen",

    NXT_START: "wenn das Programm startet",
    NXT_MOTOR_ON: "starte Motor %1 %2 mit %3 % Leistung",
    NXT_MOTOR_FOR: "drehe Motor %1 %2 mit %3 % Leistung für %4 %5",
    NXT_MOTOR_STOP: "stoppe Motor %1",
    NXT_MOVE_FOR: "fahre %1 mit %2 % Leistung für %3 %4",
    NXT_MOVE_START: "fahre los: links %1 % rechts %2 %",
    NXT_TURN_FOR: "drehe nach %1 mit %2 % Leistung für %3 Sekunden",
    NXT_MOVE_STOP: "halte an",
    NXT_BEEP: "spiele Note %1 für %2 Sekunden",
    NXT_TONE: "spiele Ton %1 Hz für %2 Sekunden",
    NXT_SHOW_TEXT: "zeige Text %1 in Zeile %2",
    NXT_SHOW_NUMBER: "zeige Zahl %1 in Zeile %2",
    NXT_CLEAR_SCREEN: "lösche Anzeige",
    NXT_WAIT: "warte %1 Sekunden",
    NXT_REPEAT: "wiederhole %1 mal",
    NXT_FOREVER: "wiederhole fortlaufend",
    NXT_IF: "falls %1 dann",
    NXT_ELSE: "sonst",
    NXT_WAIT_UNTIL: "warte bis %1",
    NXT_REPEAT_UNTIL: "wiederhole bis %1",
    NXT_STOP_PROGRAM: "stoppe Programm",
    NXT_TOUCH_PRESSED: "Berührungssensor an Port %1 gedrückt?",
    NXT_LIGHT: "Lichtsensor an Port %1 Helligkeit %",
    NXT_DISTANCE: "Ultraschallsensor an Port %1 Abstand cm",
    NXT_SOUND_LEVEL: "Geräuschsensor an Port %1 Lautstärke %",
    NXT_ROTATION: "Motor %1 Drehung in Grad",
    NXT_RESET_ROTATION: "setze Drehung von Motor %1 zurück",
    NXT_BUTTON_PRESSED: "NXT-Taste %1 gedrückt?",
    NXT_TIMER: "Stoppuhr in Sekunden",
    NXT_RESET_TIMER: "setze Stoppuhr zurück",
    NXT_RANDOM: "Zufallszahl von %1 bis %2",
    NXT_AND: "und",
    NXT_OR: "oder",
    NXT_NOT: "nicht %1",
    NXT_TRUE: "wahr",
    NXT_FALSE: "falsch",

    NXT_FORWARD: "vorwärts",
    NXT_BACKWARD: "rückwärts",
    NXT_LEFT: "links",
    NXT_RIGHT: "rechts",
    NXT_SECONDS: "Sekunden",
    NXT_ROTATIONS: "Umdrehungen",
    NXT_DEGREES: "Grad",
    NXT_ALL: "alle",
    NXT_BTN_ORANGE: "orange",
    NXT_BTN_LEFT: "Pfeil links",
    NXT_BTN_RIGHT: "Pfeil rechts",
    NXT_HELLO: "Hallo!",
    NXT_NOTE_B: "H",
  },
};

const MOTOR_PORTS = [["A", "A"], ["B", "B"], ["C", "C"]];
const SENSOR_PORTS = [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"]];
const DIRECTIONS = [["%{BKY_NXT_FORWARD}", "fwd"], ["%{BKY_NXT_BACKWARD}", "rev"]];
const LINES = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => [String(n), String(n)]);
// Frequencies in Hz. The note below the high C is called "B" in English and "H" in German.
const NOTES = [["C", "262"], ["D", "294"], ["E", "330"], ["F", "349"], ["G", "392"], ["A", "440"], ["%{BKY_NXT_NOTE_B}", "494"], ["C'", "523"]];

const dropdown = (name, options) => ({ type: "field_dropdown", name, options });
const number = (name) => ({ type: "input_value", name, check: "Number" });
const condition = (name) => ({ type: "input_value", name, check: "Boolean" });
const statement = { previousStatement: null, nextStatement: null };

const BLOCKS = [
  { type: "nxt_start", message0: "%{BKY_NXT_START}", nextStatement: null, colour: COLOURS.events }, // drawn with a "hat" because the theme sets startHats

  // --- single motors
  { type: "nxt_motor_on", message0: "%{BKY_NXT_MOTOR_ON}", args0: [dropdown("PORT", MOTOR_PORTS), dropdown("DIR", DIRECTIONS), number("POWER")], inputsInline: true, ...statement, colour: COLOURS.motors },
  { type: "nxt_motor_for", message0: "%{BKY_NXT_MOTOR_FOR}", args0: [dropdown("PORT", MOTOR_PORTS), dropdown("DIR", DIRECTIONS), number("POWER"), number("AMOUNT"), dropdown("UNIT", [["%{BKY_NXT_SECONDS}", "s"], ["%{BKY_NXT_ROTATIONS}", "rot"], ["%{BKY_NXT_DEGREES}", "deg"]])], inputsInline: true, ...statement, colour: COLOURS.motors },
  { type: "nxt_motor_stop", message0: "%{BKY_NXT_MOTOR_STOP}", args0: [dropdown("PORT", [...MOTOR_PORTS, ["%{BKY_NXT_ALL}", "ABC"]])], ...statement, colour: COLOURS.motors },

  // --- driving with two motors (B = left wheel, C = right wheel, the usual NXT layout)
  { type: "nxt_move_for", message0: "%{BKY_NXT_MOVE_FOR}", args0: [dropdown("DIR", DIRECTIONS), number("POWER"), number("AMOUNT"), dropdown("UNIT", [["%{BKY_NXT_SECONDS}", "s"], ["%{BKY_NXT_ROTATIONS}", "rot"]])], inputsInline: true, ...statement, colour: COLOURS.movement },
  { type: "nxt_move_start", message0: "%{BKY_NXT_MOVE_START}", args0: [number("LEFT"), number("RIGHT")], inputsInline: true, ...statement, colour: COLOURS.movement },
  { type: "nxt_turn_for", message0: "%{BKY_NXT_TURN_FOR}", args0: [dropdown("SIDE", [["%{BKY_NXT_LEFT}", "left"], ["%{BKY_NXT_RIGHT}", "right"]]), number("POWER"), number("SECONDS")], inputsInline: true, ...statement, colour: COLOURS.movement },
  { type: "nxt_move_stop", message0: "%{BKY_NXT_MOVE_STOP}", ...statement, colour: COLOURS.movement },

  // --- sound
  { type: "nxt_beep", message0: "%{BKY_NXT_BEEP}", args0: [dropdown("NOTE", NOTES), number("SECONDS")], inputsInline: true, ...statement, colour: COLOURS.sound },
  { type: "nxt_tone", message0: "%{BKY_NXT_TONE}", args0: [number("HZ"), number("SECONDS")], inputsInline: true, ...statement, colour: COLOURS.sound },

  // --- display
  { type: "nxt_show_text", message0: "%{BKY_NXT_SHOW_TEXT}", args0: [{ type: "field_input", name: "TEXT", text: "%{BKY_NXT_HELLO}" }, dropdown("LINE", LINES)], ...statement, colour: COLOURS.display },
  { type: "nxt_show_number", message0: "%{BKY_NXT_SHOW_NUMBER}", args0: [number("VALUE"), dropdown("LINE", LINES)], inputsInline: true, ...statement, colour: COLOURS.display },
  { type: "nxt_clear_screen", message0: "%{BKY_NXT_CLEAR_SCREEN}", ...statement, colour: COLOURS.display },

  // --- control
  { type: "nxt_wait", message0: "%{BKY_NXT_WAIT}", args0: [number("SECONDS")], inputsInline: true, ...statement, colour: COLOURS.control },
  { type: "nxt_repeat", message0: "%{BKY_NXT_REPEAT}", args0: [number("TIMES")], message1: "%1", args1: [{ type: "input_statement", name: "DO" }], inputsInline: true, ...statement, colour: COLOURS.control },
  { type: "nxt_forever", message0: "%{BKY_NXT_FOREVER}", message1: "%1", args1: [{ type: "input_statement", name: "DO" }], previousStatement: null, colour: COLOURS.control },
  { type: "nxt_if", message0: "%{BKY_NXT_IF}", args0: [condition("IF")], message1: "%1", args1: [{ type: "input_statement", name: "DO" }], inputsInline: true, ...statement, colour: COLOURS.control },
  { type: "nxt_if_else", message0: "%{BKY_NXT_IF}", args0: [condition("IF")], message1: "%1", args1: [{ type: "input_statement", name: "DO" }], message2: "%{BKY_NXT_ELSE}", message3: "%1", args3: [{ type: "input_statement", name: "ELSE" }], inputsInline: true, ...statement, colour: COLOURS.control },
  { type: "nxt_wait_until", message0: "%{BKY_NXT_WAIT_UNTIL}", args0: [condition("UNTIL")], inputsInline: true, ...statement, colour: COLOURS.control },
  { type: "nxt_repeat_until", message0: "%{BKY_NXT_REPEAT_UNTIL}", args0: [condition("UNTIL")], message1: "%1", args1: [{ type: "input_statement", name: "DO" }], inputsInline: true, ...statement, colour: COLOURS.control },
  { type: "nxt_stop_program", message0: "%{BKY_NXT_STOP_PROGRAM}", previousStatement: null, colour: COLOURS.control },

  // --- sensors
  { type: "nxt_touch_pressed", message0: "%{BKY_NXT_TOUCH_PRESSED}", args0: [dropdown("PORT", SENSOR_PORTS)], output: "Boolean", colour: COLOURS.sensors },
  { type: "nxt_light", message0: "%{BKY_NXT_LIGHT}", args0: [dropdown("PORT", SENSOR_PORTS)], output: "Number", colour: COLOURS.sensors },
  { type: "nxt_distance", message0: "%{BKY_NXT_DISTANCE}", args0: [dropdown("PORT", SENSOR_PORTS)], output: "Number", colour: COLOURS.sensors },
  { type: "nxt_sound_level", message0: "%{BKY_NXT_SOUND_LEVEL}", args0: [dropdown("PORT", SENSOR_PORTS)], output: "Number", colour: COLOURS.sensors },
  { type: "nxt_rotation", message0: "%{BKY_NXT_ROTATION}", args0: [dropdown("PORT", MOTOR_PORTS)], output: "Number", colour: COLOURS.sensors },
  { type: "nxt_reset_rotation", message0: "%{BKY_NXT_RESET_ROTATION}", args0: [dropdown("PORT", MOTOR_PORTS)], ...statement, colour: COLOURS.sensors },
  { type: "nxt_button_pressed", message0: "%{BKY_NXT_BUTTON_PRESSED}", args0: [dropdown("BUTTON", [["%{BKY_NXT_BTN_ORANGE}", "BTNCENTER"], ["%{BKY_NXT_BTN_LEFT}", "BTNLEFT"], ["%{BKY_NXT_BTN_RIGHT}", "BTNRIGHT"]])], output: "Boolean", colour: COLOURS.sensors },
  { type: "nxt_timer", message0: "%{BKY_NXT_TIMER}", output: "Number", colour: COLOURS.sensors },
  { type: "nxt_reset_timer", message0: "%{BKY_NXT_RESET_TIMER}", ...statement, colour: COLOURS.sensors },

  // --- operators
  { type: "nxt_math", message0: "%1 %2 %3", args0: [number("A"), dropdown("OP", [["+", "+"], ["−", "-"], ["×", "*"], ["÷", "/"]]), number("B")], inputsInline: true, output: "Number", colour: COLOURS.operators },
  { type: "nxt_compare", message0: "%1 %2 %3", args0: [number("A"), dropdown("OP", [["=", "=="], ["≠", "!="], ["<", "<"], [">", ">"], ["≤", "<="], ["≥", ">="]]), number("B")], inputsInline: true, output: "Boolean", colour: COLOURS.operators },
  { type: "nxt_logic", message0: "%1 %2 %3", args0: [condition("A"), dropdown("OP", [["%{BKY_NXT_AND}", "&&"], ["%{BKY_NXT_OR}", "||"]]), condition("B")], inputsInline: true, output: "Boolean", colour: COLOURS.operators },
  { type: "nxt_not", message0: "%{BKY_NXT_NOT}", args0: [condition("A")], inputsInline: true, output: "Boolean", colour: COLOURS.operators },
  { type: "nxt_boolean", message0: "%1", args0: [dropdown("VALUE", [["%{BKY_NXT_TRUE}", "true"], ["%{BKY_NXT_FALSE}", "false"]])], output: "Boolean", colour: COLOURS.operators },
  { type: "nxt_random", message0: "%{BKY_NXT_RANDOM}", args0: [number("FROM"), number("TO")], inputsInline: true, output: "Number", colour: COLOURS.operators },
];

export function defineBlocks(Blockly, language = "en") {
  Object.assign(Blockly.Msg, MESSAGES.en, MESSAGES[language] ?? {});
  Blockly.common.defineBlocksWithJsonArray(BLOCKS);
}

// A number socket that already contains an editable number, so no socket is ever empty.
const num = (value) => ({ shadow: { type: "math_number", fields: { NUM: value } } });
const block = (type, inputs) => ({ kind: "block", type, ...(inputs ? { inputs } : {}) });
const category = (key, colour, contents) => ({ kind: "category", name: `%{BKY_NXT_CAT_${key}}`, colour, contents });

export const TOOLBOX = {
  kind: "categoryToolbox",
  contents: [
    category("EVENTS", COLOURS.events, [block("nxt_start")]),
    category("MOTORS", COLOURS.motors, [
      block("nxt_motor_for", { POWER: num(50), AMOUNT: num(1) }),
      block("nxt_motor_on", { POWER: num(50) }),
      block("nxt_motor_stop"),
    ]),
    category("MOVEMENT", COLOURS.movement, [
      block("nxt_move_for", { POWER: num(50), AMOUNT: num(1) }),
      block("nxt_turn_for", { POWER: num(40), SECONDS: num(0.5) }),
      block("nxt_move_start", { LEFT: num(50), RIGHT: num(50) }),
      block("nxt_move_stop"),
    ]),
    category("SOUND", COLOURS.sound, [
      block("nxt_beep", { SECONDS: num(0.3) }),
      block("nxt_tone", { HZ: num(440), SECONDS: num(0.3) }),
    ]),
    category("DISPLAY", COLOURS.display, [
      block("nxt_show_text"),
      block("nxt_show_number", { VALUE: num(0) }),
      block("nxt_clear_screen"),
    ]),
    category("CONTROL", COLOURS.control, [
      block("nxt_wait", { SECONDS: num(1) }),
      block("nxt_repeat", { TIMES: num(10) }),
      block("nxt_forever"),
      block("nxt_if"),
      block("nxt_if_else"),
      block("nxt_wait_until"),
      block("nxt_repeat_until"),
      block("nxt_stop_program"),
    ]),
    category("SENSORS", COLOURS.sensors, [
      block("nxt_touch_pressed"),
      block("nxt_light"),
      block("nxt_distance"),
      block("nxt_sound_level"),
      block("nxt_button_pressed"),
      block("nxt_rotation"),
      block("nxt_reset_rotation"),
      block("nxt_timer"),
      block("nxt_reset_timer"),
    ]),
    category("OPERATORS", COLOURS.operators, [
      block("nxt_math", { A: num(1), B: num(1) }),
      block("nxt_compare", { A: num(0), B: num(50) }),
      block("nxt_logic"),
      block("nxt_not"),
      block("nxt_boolean"),
      block("nxt_random", { FROM: num(1), TO: num(10) }),
    ]),
    { kind: "category", name: "%{BKY_NXT_CAT_VARIABLES}", custom: "VARIABLE", colour: "#B8527A" },
  ],
};

// The program a new user sees first.
export function starterWorkspace(language = "en") {
  const hello = (MESSAGES[language] ?? MESSAGES.en).NXT_HELLO;
  return {
    blocks: {
      languageVersion: 0,
      blocks: [{
        type: "nxt_start", x: 40, y: 40,
        next: { block: {
          type: "nxt_show_text", fields: { TEXT: hello, LINE: "1" },
          next: { block: {
            type: "nxt_beep", fields: { NOTE: "440" }, inputs: { SECONDS: num(0.3) },
            next: { block: {
              type: "nxt_motor_for", fields: { PORT: "A", DIR: "fwd", UNIT: "s" }, inputs: { POWER: num(50), AMOUNT: num(1) },
            } },
          } },
        } },
      }],
    },
  };
}
export const STARTER_WORKSPACE = starterWorkspace("en");
