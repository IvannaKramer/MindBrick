// app.js – the block editor page: Blockly workspace + connect + "Run on robot" + robot panel.
/* global Blockly */
import { defineBlocks, TOOLBOX, starterWorkspace } from "./blocks.js";
import { createNxcGenerator, blockForLine } from "./generator.js";
import { createCompilerClient } from "./compiler-client.js";
import { Brick, UsbTransport, SerialTransport, SENSOR_TYPE_IS_I2C } from "./nxt.js";
import { LANGUAGES, pickLanguage, saveLanguage, createTranslator, translatePage } from "./i18n.js";
import { EXAMPLES } from "./examples.js";
import { MockTransport } from "./mock-brick.js";

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SAVE_KEY = "mindbrick.workspace.v1";
const NAME_KEY = "mindbrick.name.v1";
const PANEL_KEY = "mindbrick.panelSensors.v1";

// localStorage can be unavailable (private window, blocked site data) – the app must still work.
const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* not saved, not fatal */ } },
};

// ------------------------------------------------------------------ language

const language = pickLanguage();
const t = createTranslator(language);
document.documentElement.lang = language;
translatePage(t);

// Blockly's own texts ("Create variable…", "Delete block", …) come as one script per language.
await new Promise((resolve, reject) => {
  const script = document.createElement("script");
  script.src = `vendor/blockly/msg/${language}.js`;
  script.onload = resolve;
  script.onerror = reject;
  document.head.append(script);
});

// ------------------------------------------------------------------ workspace

defineBlocks(Blockly, language);
const generate = createNxcGenerator(Blockly);
const compile = createCompilerClient();

const theme = Blockly.Theme.defineTheme("mindbrick", {
  base: Blockly.Themes.Zelos,
  startHats: true,
  fontStyle: { family: "system-ui, sans-serif", weight: "600", size: 12 },
});

// Toolbox rows filled with their category colour, so children who can't read yet find blocks by colour.
// The open category turns white with coloured text.
class ColourCategory extends Blockly.ToolboxCategory {
  addColourBorder_(colour) {
    this.rowDiv_.style.backgroundColor = colour;
  }
  setSelected(isSelected) {
    super.setSelected(isSelected);
    this.rowDiv_.style.backgroundColor = isSelected ? "#fff" : this.colour_;
    this.rowDiv_.style.boxShadow = isSelected ? `inset 0 0 0 4px ${this.colour_}` : "";
    this.rowDiv_.querySelector(".blocklyToolboxCategoryLabel").style.color = isSelected ? this.colour_ : "#fff";
  }
}
Blockly.registry.register(Blockly.registry.Type.TOOLBOX_ITEM, Blockly.ToolboxCategory.registrationName, ColourCategory, true);

const workspace = Blockly.inject("blockly", {
  toolbox: TOOLBOX,
  renderer: "zelos", // big rounded blocks that are easy to grab with a finger
  theme,
  media: "vendor/blockly/media/",
  trashcan: true,
  zoom: { controls: true, wheel: true, pinch: true, startScale: 0.85, maxScale: 2, minScale: 0.4 },
  move: { scrollbars: true, drag: true, wheel: false },
  grid: { spacing: 28, length: 2, colour: "#d9dde2", snap: false },
});

function loadWorkspace(json) {
  Blockly.Events.disable();
  try {
    workspace.clear();
    Blockly.serialization.workspaces.load(json, workspace);
  } finally {
    Blockly.Events.enable();
  }
  store.set(SAVE_KEY, JSON.stringify(json));
  refreshCode();
}

try {
  loadWorkspace(JSON.parse(store.get(SAVE_KEY)) ?? starterWorkspace(language));
} catch {
  loadWorkspace(starterWorkspace(language));
}
$("name").value = store.get(NAME_KEY) ?? "program1";

let refreshTimer = null;
workspace.addChangeListener((event) => {
  if (event.isUiEvent) return;
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    store.set(SAVE_KEY, JSON.stringify(Blockly.serialization.workspaces.save(workspace)));
    refreshCode();
  }, 300);
});

function refreshCode() {
  $("code").textContent = generate(workspace).code;
}

// ------------------------------------------------------------------ status line and block warnings

function status(message, kind = "") {
  $("status").textContent = message;
  $("status").className = kind;
}
status(t("welcome"));

function clearWarnings() {
  for (const block of workspace.getAllBlocks(false)) block.setWarningText(null);
}

function warnBlock(blockId, message) {
  const block = blockId && workspace.getBlockById(blockId);
  if (!block) return;
  block.setWarningText(message);
  workspace.centerOnBlock(blockId);
}

// Problems found by the generator carry a key, so they can be shown in the user's language.
function problemText(problem) {
  if (problem.key === "problemPortConflict") {
    const [port, a, b] = problem.values;
    return t(problem.key, port, t(`sensor_${a}`), t(`sensor_${b}`));
  }
  return problem.key ? t(problem.key, ...problem.values) : problem.message;
}

// ------------------------------------------------------------------ program name → file name on the brick

function programFile() {
  // The NXT allows 15 characters plus ".rxe"; keep to letters, digits, "-" and "_" to be safe.
  const clean = $("name").value.trim().replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 15) || "program1";
  $("name").value = clean;
  store.set(NAME_KEY, clean);
  return clean + ".rxe";
}
$("name").addEventListener("change", programFile);

// ------------------------------------------------------------------ connection

let brick = null;
let busy = false; // true while "Run on robot" talks to the brick; background polling then keeps quiet
let batteryTimer = null;

function setConnected(on, label = t("connect")) {
  $("connect").classList.toggle("connected", on);
  $("connectLabel").textContent = label;
  $("disconnect").hidden = !on;
  $("connectBt").hidden = $("connectUsb").hidden = $("pairHint").hidden = on;
  $("connectDemo").hidden = on || !demoMode;
  if (on) $("connectBtLast").hidden = $("connectUsbLast").hidden = true;
  $("stop").disabled = !on;
  clearInterval(batteryTimer);
  if (on) batteryTimer = setInterval(showBattery, 30000);
  updatePanelVisibility();
}

async function showBattery() {
  if (!brick || busy) return;
  try {
    const volts = (await brick.batteryMillivolts()) / 1000;
    $("connectLabel").textContent = `${brickName} · ${volts.toFixed(1)} V`;
  } catch {
    await dropConnection(t("connectionLost"));
  }
}

async function dropConnection(message) {
  const old = brick;
  brick = null;
  setConnected(false);
  await old?.disconnect().catch(() => {});
  if (message) status(message, "error");
}

let brickName = "NXT";

// Open the transport and make sure a brick really answers; give up after a few seconds.
async function openBrick(transport) {
  const candidate = new Brick(transport);
  const hello = (async () => { await candidate.connect(); return candidate.deviceInfo(); })();
  const timeout = sleep(8000).then(() => { throw new Error("timeout"); });
  try {
    const info = await Promise.race([hello, timeout]);
    return { candidate, info };
  } catch (e) {
    hello.catch(() => {}).finally(() => candidate.disconnect().catch(() => {}));
    throw e;
  }
}

async function finishConnect(candidate, info, transport) {
  brick = candidate;
  brickName = info.name || "NXT";
  setConnected(true, brickName);
  await showBattery();
  status(t("connected", brickName, transport.name), "ok");
}

// Connect through the browser's chooser.
async function connect(Transport) {
  closeMenus();
  try {
    const transport = await Transport.request();
    status(t("connecting", transport.name), "busy");
    const { candidate, info } = await openBrick(transport);
    await finishConnect(candidate, info, transport);
  } catch (e) {
    if (e.name === "NotFoundError") return status(t("noRobotChosen")); // the chooser was closed
    setConnected(false);
    status(e.message === "timeout" ? t("connectionLost") : e.message, "error");
  }
}

// Connect to a robot this browser was already allowed to use – no chooser needed.
async function connectLast(Transport, chooserLabel) {
  closeMenus();
  status(t("connecting", Transport === UsbTransport ? "USB" : "Bluetooth"), "busy");
  for (const transport of await Transport.known()) {
    try {
      const { candidate, info } = await openBrick(transport);
      return await finishConnect(candidate, info, transport);
    } catch { /* try the next one */ }
  }
  status(t("lastRobotFailed", chooserLabel), "error");
}

async function refreshConnectMenu() {
  if (brick) return;
  $("connectUsbLast").hidden = !("usb" in navigator) || (await UsbTransport.known()).length === 0;
  $("connectBtLast").hidden = !("serial" in navigator) || (await SerialTransport.known()).length === 0;
}

// ?demo in the address adds a pretend robot: try the app, make screenshots, run automated tests.
const demoMode = new URLSearchParams(location.search).has("demo");
$("connectDemo").hidden = !demoMode;
$("connectDemo").addEventListener("click", () => connect(MockTransport));

$("connectUsb").addEventListener("click", () => connect(UsbTransport));
$("connectBt").addEventListener("click", () => connect(SerialTransport));
$("connectUsbLast").addEventListener("click", () => connectLast(UsbTransport, t("usb")));
$("connectBtLast").addEventListener("click", () => connectLast(SerialTransport, t("bluetooth")));
$("disconnect").addEventListener("click", async () => { closeMenus(); await dropConnection(); status(t("disconnected")); });
if (!("usb" in navigator)) $("connectUsb").disabled = true;
if (!("serial" in navigator)) $("connectBt").disabled = true;
if (!("usb" in navigator) && !("serial" in navigator) && !demoMode) status(t("noBrowserSupport"), "error");
navigator.usb?.addEventListener("disconnect", () => { if (brick?.transport instanceof UsbTransport) dropConnection(t("usbUnplugged")); });
// Let go of the brick when this tab closes, so another tab can connect.
window.addEventListener("pagehide", () => { brick?.disconnect().catch(() => {}); });

// A failed command that is not an answer from the brick (no status code) means the link is broken.
async function handleBrickError(e) {
  if (brick && !(e.status > 0)) await dropConnection(t("connectionProblem", e.message));
  else status(e.message, "error");
}

// ------------------------------------------------------------------ run and stop

async function run() {
  if (busy) return;
  busy = true;
  $("run").disabled = true;
  clearWarnings();
  try {
    const { code, lineToBlock, problems } = generate(workspace);
    if (problems.length) {
      problems.forEach((p) => warnBlock(p.blockId, problemText(p)));
      return status(problemText(problems[0]), "error");
    }

    status(t("building"), "busy");
    const result = await compile(code);
    if (!result.ok) {
      const first = result.errors.find((e) => e.kind === "error") ?? { message: "?", line: 0 };
      warnBlock(blockForLine(lineToBlock, first.line), first.message);
      return status(t("buildFailed", first.message), "error");
    }

    if (!brick) {
      await refreshConnectMenu();
      $("connectMenu").classList.add("open");
      return status(t("readyConnect", result.rxe.length), "ok");
    }

    const file = programFile();
    status(t("sending", file), "busy");
    await brick.stopProgram().catch(() => {}); // a running program would block replacing its file
    await brick.uploadFile(file, result.rxe);
    await brick.startProgram(file);
    status(t("running", file), "ok");
    if (panelOpen()) refreshPrograms();
  } catch (e) {
    await handleBrickError(e);
  } finally {
    busy = false;
    $("run").disabled = false;
  }
}

$("run").addEventListener("click", run);
$("stop").addEventListener("click", async () => {
  try {
    await brick.stopProgram();
    status(t("stopped"));
  } catch (e) {
    if (e.status === 0xec) status(t("nothingRunning"));
    else await handleBrickError(e);
  }
});

// ------------------------------------------------------------------ robot panel: live sensors, motors, programs

const SENSOR_KINDS = ["none", "touch", "light", "sound", "distance"];
const panelOpen = () => $("robotPanel").classList.contains("open");
const configured = {}; // port → kind we last set the brick's port up for
let pollTimer = null;

function buildPanel() {
  const saved = JSON.parse(store.get(PANEL_KEY) ?? "{}");
  for (let port = 1; port <= 4; port++) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<span class="label"></span><select></select><span class="value" id="sensorValue${port}">–</span>`;
    card.querySelector(".label").textContent = t("panelPort", port);
    const select = card.querySelector("select");
    select.id = `sensorKind${port}`;
    for (const kind of SENSOR_KINDS) select.add(new Option(kind === "none" ? t("panelNone") : t(`sensor_${kind}`), kind));
    select.value = saved[port] ?? "none";
    select.addEventListener("change", () => {
      store.set(PANEL_KEY, JSON.stringify(Object.fromEntries([1, 2, 3, 4].map((p) => [p, $(`sensorKind${p}`).value]))));
    });
    $("sensorCards").append(card);
  }
  for (const motor of "ABC") {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<span class="label">${motor}</span><span class="value" id="motorValue${motor}">–</span>`;
    $("motorCards").append(card);
  }
}
buildPanel();

function updatePanelVisibility() {
  $("panelConnectFirst").hidden = !!brick;
  $("panelLive").hidden = !brick;
  clearTimeout(pollTimer);
  if (brick && panelOpen()) { refreshPrograms(); pollSensors(); }
}

// Read every value once, then schedule the next round. One command at a time: Bluetooth is slow.
async function pollSensors() {
  clearTimeout(pollTimer);
  if (!brick || !panelOpen()) return;
  if (!busy) {
    try {
      const running = await brick.currentProgram();
      $("panelRunningNote").hidden = !running;
      for (let port = 1; port <= 4; port++) {
        $(`sensorValue${port}`).textContent = await sensorText(port, $(`sensorKind${port}`).value, !!running);
      }
      for (const motor of "ABC") $(`motorValue${motor}`).textContent = t("panelDegrees", await brick.motorRotation(motor));
    } catch (e) {
      if (!(e.status > 0)) return handleBrickError(e);
    }
  }
  pollTimer = setTimeout(pollSensors, 300);
}

async function sensorText(port, kind, programRunning) {
  try {
    if (programRunning) {
      // Hands off the settings while a program runs – just show what that program sees.
      const reading = await brick.readSensor(port);
      if (reading.type === 0) return "–";
      return SENSOR_TYPE_IS_I2C(reading.type) ? "…" : String(reading.value);
    }
    if (configured[port] !== kind) {
      await brick.setupSensor(port, kind);
      configured[port] = kind;
      if (kind === "distance") await sleep(200); // the ultrasonic sensor needs a moment to wake up
    }
    if (kind === "none") return "–";
    if (kind === "distance") {
      const cm = await brick.readDistance(port);
      return cm === null || cm === 255 ? "–" : `${cm} cm`;
    }
    const { value } = await brick.readSensor(port);
    return kind === "touch" ? (value ? "●" : "○") : `${value} %`;
  } catch (e) {
    if (e.status > 0) return "–"; // e.g. no sensor plugged in – not a broken connection
    throw e;
  }
}

async function refreshPrograms() {
  if (!brick) return;
  try {
    const [files, info, running] = [await brick.listFiles("*.rxe"), await brick.deviceInfo(), await brick.currentProgram()];
    $("freeFlash").textContent = `· ${t("panelFree", Math.round(info.freeFlash / 1024))}`;
    const list = $("programList");
    list.textContent = files.length ? "" : t("panelNoPrograms");
    for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
      const row = document.createElement("div");
      row.className = "program-row" + (file.name === running ? " running" : "");
      row.innerHTML = `<span class="file"></span><button class="run"></button><button class="danger"></button>`;
      row.querySelector(".file").textContent = file.name.replace(/\.rxe$/, "");
      row.querySelector(".file").insertAdjacentHTML("beforeend", `<small>${(file.size / 1024).toFixed(1)} KB</small>`);
      row.querySelector(".run").textContent = t("panelRun");
      row.querySelector(".danger").textContent = t("panelDelete");
      row.querySelector(".run").addEventListener("click", () => panelAction(async () => {
        await brick.stopProgram().catch(() => {});
        await brick.startProgram(file.name);
        status(t("started", file.name), "ok");
      }));
      row.querySelector(".danger").addEventListener("click", () => {
        if (!confirm(t("confirmDelete", file.name))) return;
        panelAction(async () => {
          if ((await brick.currentProgram()) === file.name) await brick.stopProgram().catch(() => {});
          await brick.deleteFile(file.name);
          status(t("deleted", file.name));
        });
      });
      list.append(row);
    }
  } catch (e) {
    await handleBrickError(e);
  }
}

async function panelAction(action) {
  if (busy || !brick) return;
  busy = true;
  try { await action(); } catch (e) { await handleBrickError(e); } finally { busy = false; }
  await refreshPrograms();
}

// Preselect the sensors the current program uses, so the panel "just works" for it.
function adoptProgramSensors() {
  const { sensors } = generate(workspace);
  for (const [port, kind] of Object.entries(sensors)) $(`sensorKind${port}`).value = kind;
}

async function closePanel() {
  $("robotPanel").classList.remove("open");
  $("robot").classList.remove("on");
  clearTimeout(pollTimer);
  Blockly.svgResize(workspace);
  // Switch the sensors off again (the light sensor's lamp would stay on otherwise) – unless a program uses them.
  if (brick && !busy) {
    try {
      if (!(await brick.currentProgram())) for (const port of Object.keys(configured)) await brick.setupSensor(Number(port), "none");
    } catch { /* closing must never fail */ }
  }
  for (const port of Object.keys(configured)) delete configured[port];
}

$("robot").addEventListener("click", () => {
  if (panelOpen()) return closePanel();
  $("codePanel").classList.remove("open");
  $("toggleCode").textContent = t("showCode");
  $("robotPanel").classList.add("open");
  $("robot").classList.add("on");
  adoptProgramSensors();
  Blockly.svgResize(workspace);
  updatePanelVisibility();
});
$("robotClose").addEventListener("click", closePanel);

// ------------------------------------------------------------------ menus, code panel, files, examples, language

function closeMenus() {
  document.querySelectorAll(".menu.open").forEach((m) => m.classList.remove("open"));
}
for (const [button, menu] of [["connect", "connectMenu"], ["more", "moreMenu"]]) {
  $(button).addEventListener("click", async (e) => {
    e.stopPropagation();
    const wasOpen = $(menu).classList.contains("open");
    closeMenus();
    if (menu === "connectMenu" && !wasOpen) await refreshConnectMenu();
    $(menu).classList.toggle("open", !wasOpen);
  });
}
document.addEventListener("click", (e) => { if (!e.target.closest(".menu-items")) closeMenus(); });

$("toggleCode").addEventListener("click", async () => {
  closeMenus();
  if (panelOpen()) await closePanel();
  const open = $("codePanel").classList.toggle("open");
  $("toggleCode").textContent = t(open ? "hideCode" : "showCode");
  Blockly.svgResize(workspace);
});

$("save").addEventListener("click", () => {
  closeMenus();
  const data = { app: "MindBrick", version: 1, name: $("name").value, workspace: Blockly.serialization.workspaces.save(workspace) };
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }));
  link.download = `${programFile().replace(/\.rxe$/, "")}.mindbrick`;
  link.click();
  URL.revokeObjectURL(link.href);
});

$("open").addEventListener("click", () => { closeMenus(); $("file").click(); });
$("file").addEventListener("change", async () => {
  const file = $("file").files[0];
  $("file").value = "";
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== "MindBrick" || !data.workspace) throw new Error("not a MindBrick file");
    loadWorkspace(data.workspace);
    $("name").value = data.name ?? "program1";
    programFile();
    status(t("opened", file.name), "ok");
  } catch (e) {
    status(t("openFailed", e.message), "error");
  }
});

$("newProgram").addEventListener("click", () => {
  closeMenus();
  if (!confirm(t("confirmNew"))) return;
  loadWorkspace(starterWorkspace(language));
  status(t("newStarted"));
});

for (const example of EXAMPLES) {
  const button = document.createElement("button");
  button.textContent = example.name[language] ?? example.name.en;
  button.addEventListener("click", () => {
    closeMenus();
    if (!confirm(t("confirmExample"))) return;
    loadWorkspace(example.build(language));
    $("name").value = example.id;
    programFile();
    workspace.scrollCenter();
    status(t("exampleOpened", button.textContent), "ok");
  });
  $("examplesList").append(button);
}

for (const [code, name] of Object.entries(LANGUAGES)) {
  const button = document.createElement("button");
  button.textContent = name;
  button.classList.toggle("current", code === language);
  button.addEventListener("click", () => {
    saveLanguage(code);
    // Reload without ?lang=… so the saved choice wins. The blocks are kept (they are saved automatically).
    location.href = location.pathname;
  });
  $("languageList").append(button);
}

window.addEventListener("resize", () => Blockly.svgResize(workspace));

// ------------------------------------------------------------------ offline use (service worker)

// Not on localhost: while developing, a cache that serves yesterday's files is only confusing.
if ("serviceWorker" in navigator && !["localhost", "127.0.0.1"].includes(location.hostname)) {
  const isUpdate = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js").then((registration) => {
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "activated" && !busy) status(t(isUpdate ? "updateReady" : "offlineReady"), "ok");
      });
    });
  }).catch(() => { /* offline support is a bonus, never a reason to fail */ });
}
