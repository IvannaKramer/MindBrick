// i18n.js – texts of the page itself (buttons, status messages) in every supported language.
// Block texts live in blocks.js. To add a language: add a table here and one in blocks.js,
// and add it to LANGUAGES. Missing texts fall back to English.

export const LANGUAGES = { en: "English", de: "Deutsch" };

const UI = {
  en: {
    programName: "Program name",
    connect: "Connect",
    bluetooth: "Bluetooth",
    bluetoothLast: "Bluetooth – last robot",
    usb: "USB cable",
    usbLast: "USB – last robot",
    demoRobot: "Demo robot (no hardware)",
    pairHint: "Pair the brick in your device's Bluetooth settings first (passkey 1234).",
    disconnect: "Disconnect",
    run: "Run on robot",
    stop: "Stop program",
    more: "More",
    showCode: "Show code",
    hideCode: "Hide code",
    brickPanel: "Robot: sensors and programs",
    examples: "Examples",
    save: "Save program to file",
    open: "Open program from file",
    newProgram: "New program",
    language: "Language",
    testPage: "Developer test page",
    about: "About / source code",
    codeTitle: "NXC code made from your blocks",
    footer: "Independent hobby project for LEGO® MINDSTORMS® NXT bricks – not affiliated with or endorsed by the LEGO Group.",

    welcome: "Build a program, connect the robot, then press “Run on robot”.",
    noBrowserSupport: "This browser cannot talk to the robot. Use Chrome or Edge (on Android: Chrome 137 or newer).",
    connecting: "Connecting via {0}…",
    connected: "Connected to “{0}” via {1}.",
    noRobotChosen: "No robot chosen.",
    disconnected: "Disconnected.",
    connectionLost: "The connection to the robot was lost.",
    usbUnplugged: "The USB cable was unplugged.",
    connectionProblem: "Connection problem: {0}",
    lastRobotFailed: "Could not reach the last robot. Is it switched on? You can also pick it again with “{0}”.",
    building: "Building your program…",
    buildFailed: "The program could not be built: {0}",
    readyConnect: "Program is ready ({0} bytes). Connect the robot, then press “Run on robot” again.",
    sending: "Sending {0} to the robot…",
    running: "▶ {0} is running on the robot. You can also start it later on the brick: My Files → Software files.",
    stopped: "■ Program stopped.",
    nothingRunning: "No program is running.",
    opened: "Opened “{0}”.",
    openFailed: "Could not open that file ({0}).",
    confirmNew: "Start a new program? The blocks you have now will be removed.",
    confirmExample: "Open this example? The blocks you have now will be removed.",
    newStarted: "Started a new program.",
    exampleOpened: "Example “{0}” opened.",

    problemNoStart: "Add a “when program starts” block and attach your blocks below it.",
    problemPortConflict: "Port {0} is used as a {1} and as a {2}. Pick a different port for one of them.",
    sensor_touch: "touch sensor", sensor_light: "light sensor", sensor_sound: "sound sensor", sensor_distance: "ultrasonic sensor",

    panelTitle: "Robot",
    panelConnectFirst: "Connect the robot to see its sensors and programs.",
    panelSensors: "Sensors",
    panelMotors: "Motors",
    panelPrograms: "Programs on the robot",
    panelFree: "{0} KB free",
    panelNoPrograms: "No programs yet.",
    panelRunningNote: "A program is running: values are shown as that program set the sensors up.",
    panelPort: "Port {0}",
    panelNone: "nothing",
    panelDegrees: "{0}°",
    panelRun: "Run",
    panelDelete: "Delete",
    panelClose: "Close",
    panelRefresh: "Refresh",
    confirmDelete: "Delete “{0}” from the robot?",
    deleted: "“{0}” deleted from the robot.",
    started: "▶ {0} started.",
    updateReady: "A new version of MindBrick is ready – reload the page to use it.",
    offlineReady: "MindBrick now also works without internet on this device.",
  },
  de: {
    programName: "Programmname",
    connect: "Verbinden",
    bluetooth: "Bluetooth",
    bluetoothLast: "Bluetooth – letzter Roboter",
    usb: "USB-Kabel",
    usbLast: "USB – letzter Roboter",
    demoRobot: "Demo-Roboter (ohne Hardware)",
    pairHint: "Kopple den NXT zuerst in den Bluetooth-Einstellungen deines Geräts (Code 1234).",
    disconnect: "Trennen",
    run: "Auf Roboter starten",
    stop: "Programm stoppen",
    more: "Mehr",
    showCode: "Code anzeigen",
    hideCode: "Code ausblenden",
    brickPanel: "Roboter: Sensoren und Programme",
    examples: "Beispiele",
    save: "Programm als Datei speichern",
    open: "Programm aus Datei öffnen",
    newProgram: "Neues Programm",
    language: "Sprache",
    testPage: "Testseite für Entwickler",
    about: "Über das Projekt / Quellcode",
    codeTitle: "NXC-Code aus deinen Blöcken",
    footer: "Unabhängiges Hobbyprojekt für LEGO® MINDSTORMS® NXT – steht in keiner Verbindung zur LEGO Gruppe und wird von ihr nicht unterstützt.",

    welcome: "Baue ein Programm, verbinde den Roboter und drücke dann „Auf Roboter starten“.",
    noBrowserSupport: "Dieser Browser kann nicht mit dem Roboter sprechen. Nimm Chrome oder Edge (auf Android: Chrome 137 oder neuer).",
    connecting: "Verbinde über {0}…",
    connected: "Verbunden mit „{0}“ über {1}.",
    noRobotChosen: "Kein Roboter ausgewählt.",
    disconnected: "Getrennt.",
    connectionLost: "Die Verbindung zum Roboter ist abgebrochen.",
    usbUnplugged: "Das USB-Kabel wurde abgezogen.",
    connectionProblem: "Verbindungsproblem: {0}",
    lastRobotFailed: "Der letzte Roboter ist nicht erreichbar. Ist er eingeschaltet? Du kannst ihn auch mit „{0}“ neu auswählen.",
    building: "Dein Programm wird gebaut…",
    buildFailed: "Das Programm konnte nicht gebaut werden: {0}",
    readyConnect: "Das Programm ist fertig ({0} Bytes). Verbinde den Roboter und drücke noch einmal „Auf Roboter starten“.",
    sending: "{0} wird zum Roboter geschickt…",
    running: "▶ {0} läuft auf dem Roboter. Du kannst es später auch am NXT starten: My Files → Software files.",
    stopped: "■ Programm gestoppt.",
    nothingRunning: "Es läuft gerade kein Programm.",
    opened: "„{0}“ geöffnet.",
    openFailed: "Diese Datei konnte nicht geöffnet werden ({0}).",
    confirmNew: "Neues Programm anfangen? Deine jetzigen Blöcke werden entfernt.",
    confirmExample: "Dieses Beispiel öffnen? Deine jetzigen Blöcke werden entfernt.",
    newStarted: "Neues Programm angefangen.",
    exampleOpened: "Beispiel „{0}“ geöffnet.",

    problemNoStart: "Füge einen Block „wenn das Programm startet“ hinzu und hänge deine Blöcke darunter.",
    problemPortConflict: "Port {0} wird als {1} und als {2} benutzt. Nimm für einen davon einen anderen Port.",
    sensor_touch: "Berührungssensor", sensor_light: "Lichtsensor", sensor_sound: "Geräuschsensor", sensor_distance: "Ultraschallsensor",

    panelTitle: "Roboter",
    panelConnectFirst: "Verbinde den Roboter, um Sensoren und Programme zu sehen.",
    panelSensors: "Sensoren",
    panelMotors: "Motoren",
    panelPrograms: "Programme auf dem Roboter",
    panelFree: "{0} KB frei",
    panelNoPrograms: "Noch keine Programme.",
    panelRunningNote: "Ein Programm läuft: Die Werte erscheinen so, wie dieses Programm die Sensoren eingestellt hat.",
    panelPort: "Port {0}",
    panelNone: "nichts",
    panelDegrees: "{0}°",
    panelRun: "Starten",
    panelDelete: "Löschen",
    panelClose: "Schließen",
    panelRefresh: "Aktualisieren",
    confirmDelete: "„{0}“ vom Roboter löschen?",
    deleted: "„{0}“ wurde vom Roboter gelöscht.",
    started: "▶ {0} gestartet.",
    updateReady: "Eine neue Version von MindBrick ist bereit – lade die Seite neu, um sie zu benutzen.",
    offlineReady: "MindBrick funktioniert auf diesem Gerät jetzt auch ohne Internet.",
  },
};

const LANGUAGE_KEY = "mindbrick.language.v1";

// Order: ?lang=de in the address, then the saved choice, then the browser's language, then English.
export function pickLanguage() {
  let saved = null;
  try { saved = localStorage.getItem(LANGUAGE_KEY); } catch { /* storage blocked */ }
  const wanted = [new URLSearchParams(location.search).get("lang"), saved, ...(navigator.languages ?? [navigator.language])];
  for (const w of wanted) {
    const short = (w ?? "").slice(0, 2).toLowerCase();
    if (short in LANGUAGES) return short;
  }
  return "en";
}

export function saveLanguage(language) {
  try { localStorage.setItem(LANGUAGE_KEY, language); } catch { /* storage blocked */ }
}

// createTranslator("de") → t("connected", "NXT", "USB")
export function createTranslator(language) {
  return (key, ...values) => (UI[language]?.[key] ?? UI.en[key] ?? key).replace(/\{(\d)\}/g, (_, i) => values[i] ?? "");
}

// Fill in every element that carries data-i18n="key" (text) or data-i18n-label="key" (aria-label).
export function translatePage(t, root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll("[data-i18n-label]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nLabel)); });
}
