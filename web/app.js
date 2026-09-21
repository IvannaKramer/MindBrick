// app.js – the block editor page: Blockly workspace + connect + "Run on robot".
/* global Blockly */
import { defineBlocks, TOOLBOX, STARTER_WORKSPACE } from "./blocks.js";
import { createNxcGenerator, blockForLine } from "./generator.js";
import { createCompilerClient } from "./compiler-client.js";
import { Brick, UsbTransport, SerialTransport } from "./nxt.js";

const $ = (id) => document.getElementById(id);
const SAVE_KEY = "mindbrick.workspace.v1";
const NAME_KEY = "mindbrick.name.v1";

// ------------------------------------------------------------------ workspace

defineBlocks(Blockly, "en");
const generate = createNxcGenerator(Blockly);
const compile = createCompilerClient();

const theme = Blockly.Theme.defineTheme("mindbrick", {
  base: Blockly.Themes.Zelos,
  startHats: true,
  fontStyle: { family: "system-ui, sans-serif", weight: "600", size: 12 },
});

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

// localStorage can be unavailable (private window, blocked site data) – the app must still work.
const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* not saved, not fatal */ } },
};

function loadWorkspace(json) {
  Blockly.Events.disable();
  try {
    workspace.clear();
    Blockly.serialization.workspaces.load(json, workspace);
  } finally {
    Blockly.Events.enable();
  }
  refreshCode();
}

try {
  loadWorkspace(JSON.parse(store.get(SAVE_KEY)) ?? STARTER_WORKSPACE);
} catch {
  loadWorkspace(STARTER_WORKSPACE);
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

function clearWarnings() {
  for (const block of workspace.getAllBlocks(false)) block.setWarningText(null);
}

function warnBlock(blockId, message) {
  const block = blockId && workspace.getBlockById(blockId);
  if (!block) return;
  block.setWarningText(message);
  workspace.centerOnBlock(blockId);
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
let batteryTimer = null;

function setConnected(on, label = "Connect") {
  $("connect").classList.toggle("connected", on);
  $("connectLabel").textContent = label;
  $("disconnect").hidden = !on;
  $("connectBt").hidden = $("connectUsb").hidden = on;
  $("stop").disabled = !on;
  clearInterval(batteryTimer);
  if (on) batteryTimer = setInterval(showBattery, 30000);
}

async function showBattery() {
  if (!brick || busy) return;
  try {
    const volts = (await brick.batteryMillivolts()) / 1000;
    $("connectLabel").textContent = `NXT · ${volts.toFixed(1)} V`;
  } catch {
    await dropConnection("The connection to the robot was lost.");
  }
}

async function dropConnection(message) {
  const old = brick;
  brick = null;
  setConnected(false);
  await old?.disconnect().catch(() => {});
  if (message) status(message, "error");
}

async function connect(Transport) {
  closeMenus();
  try {
    const transport = await Transport.request();
    status(`Connecting via ${transport.name}…`, "busy");
    const candidate = new Brick(transport);
    await candidate.connect();
    brick = candidate;
    const info = await brick.deviceInfo();
    setConnected(true, info.name);
    await showBattery();
    status(`Connected to “${info.name}” via ${transport.name}.`, "ok");
  } catch (e) {
    if (e.name === "NotFoundError") return status("No robot chosen."); // the chooser was closed
    brick = null;
    setConnected(false);
    status(e.message, "error");
  }
}

$("connectUsb").addEventListener("click", () => connect(UsbTransport));
$("connectBt").addEventListener("click", () => connect(SerialTransport));
$("disconnect").addEventListener("click", async () => { closeMenus(); await dropConnection(); status("Disconnected."); });
if (!("usb" in navigator)) $("connectUsb").disabled = true;
if (!("serial" in navigator)) $("connectBt").disabled = true;
if (!("usb" in navigator) && !("serial" in navigator)) status("This browser cannot talk to the robot. Use Chrome or Edge (on Android: Chrome 137 or newer).", "error");
navigator.usb?.addEventListener("disconnect", () => { if (brick?.transport instanceof UsbTransport) dropConnection("The USB cable was unplugged."); });
// Let go of the brick when this tab closes, so another tab can connect.
window.addEventListener("pagehide", () => { brick?.disconnect().catch(() => {}); });

// ------------------------------------------------------------------ run and stop

let busy = false;

async function run() {
  if (busy) return;
  busy = true;
  $("run").disabled = true;
  clearWarnings();
  try {
    const { code, lineToBlock, problems } = generate(workspace);
    if (problems.length) {
      problems.forEach((p) => warnBlock(p.blockId, p.message));
      return status(problems[0].message, "error");
    }

    status("Building your program…", "busy");
    const result = await compile(code);
    if (!result.ok) {
      const first = result.errors.find((e) => e.kind === "error") ?? { message: "unknown problem", line: 0 };
      warnBlock(blockForLine(lineToBlock, first.line), first.message);
      return status(`The program could not be built: ${first.message}`, "error");
    }

    if (!brick) {
      $("connectMenu").classList.add("open");
      return status(`Program is ready (${result.rxe.length} bytes). Connect the robot, then press “Run on robot” again.`, "ok");
    }

    const file = programFile();
    status(`Sending ${file} to the robot…`, "busy");
    await brick.stopProgram().catch(() => {}); // a running program would block replacing its file
    await brick.uploadFile(file, result.rxe);
    await brick.startProgram(file);
    status(`▶ ${file} is running on the robot. You can also start it later from the brick: My Files → Software files.`, "ok");
  } catch (e) {
    status(e.message, "error");
    if (brick && !(e.status > 0)) await dropConnection(`Connection problem: ${e.message}`); // not a brick error code → the link is broken
  } finally {
    busy = false;
    $("run").disabled = false;
  }
}

$("run").addEventListener("click", run);
$("stop").addEventListener("click", async () => {
  try {
    await brick.stopProgram();
    status("■ Program stopped.");
  } catch (e) {
    status(e.status === 0xec ? "No program is running." : e.message, e.status === 0xec ? "" : "error");
  }
});

// ------------------------------------------------------------------ menus, code panel, files

function closeMenus() {
  document.querySelectorAll(".menu.open").forEach((m) => m.classList.remove("open"));
}
for (const [button, menu] of [["connect", "connectMenu"], ["more", "moreMenu"]]) {
  $(button).addEventListener("click", (e) => {
    e.stopPropagation();
    const wasOpen = $(menu).classList.contains("open");
    closeMenus();
    $(menu).classList.toggle("open", !wasOpen);
  });
}
document.addEventListener("click", (e) => { if (!e.target.closest(".menu-items")) closeMenus(); });

$("toggleCode").addEventListener("click", () => {
  closeMenus();
  const open = $("codePanel").classList.toggle("open");
  $("toggleCode").textContent = open ? "Hide code" : "Show code";
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
    store.set(SAVE_KEY, JSON.stringify(data.workspace));
    $("name").value = data.name ?? "program1";
    programFile();
    status(`Opened “${file.name}”.`, "ok");
  } catch (e) {
    status(`Could not open that file (${e.message}).`, "error");
  }
});

$("newProgram").addEventListener("click", () => {
  closeMenus();
  if (!confirm("Start a new program? The blocks you have now will be removed.")) return;
  loadWorkspace(STARTER_WORKSPACE);
  store.set(SAVE_KEY, JSON.stringify(STARTER_WORKSPACE));
  status("Started a new program.");
});

window.addEventListener("resize", () => Blockly.svgResize(workspace));
