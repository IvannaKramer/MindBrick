// Takes the screenshots for the README with headless Chrome (needs google-chrome and Node 22+).
// Usage: python3 -m http.server 8765 --directory web   then   node tools/screenshots.mjs [http://localhost:8765/index.html]
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const OUT = new URL("../docs/screenshots/", import.meta.url).pathname;
const PORT = 9333;
const BASE = process.argv[2] ?? "http://localhost:8765/index.html";
mkdirSync(OUT, { recursive: true });
const chrome = spawn("google-chrome", [
  "--headless=new", `--remote-debugging-port=${PORT}`, "--no-first-run", "--no-default-browser-check",
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "mindbrick-shots-"))}`,
  "--window-size=1280,800", "--hide-scrollbars", "--force-device-scale-factor=2", "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://localhost:${PORT}/json`)).json(); break; } catch { await sleep(200); } }
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); const events = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id) { pending.get(d.id)?.(d); pending.delete(d.id); } else events.push(d); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result?.result?.value;
};
const shot = async (name, clip) => {
  await sleep(300);
  const r = await send("Page.captureScreenshot", { format: "png", ...(clip ? { clip: { ...clip, scale: 2 } } : {}) });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, "base64"));
  console.log("saved", name);
};
const setSize = (width, height, mobile = false) =>
  send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 2, mobile });

await send("Page.enable"); await send("Runtime.enable");
const goto = async (url) => { await send("Page.navigate", { url }); await sleep(2500); await evaluate("window.confirm = () => true; 1"); };

await setSize(1280, 800);
await goto(`${BASE}?demo&lang=en`);

// 1. Fresh editor with the starter block
await shot("01-editor-empty");

// 2. Example program loaded (Drive a square)
await evaluate(`[...document.querySelectorAll('#examplesList button')][0].click(); 1`);
await sleep(800);
await evaluate(`document.getElementById('status').textContent = ''; 1`);
await shot("02-example-square");

// 2b. Toolbox flyout: Movement category open
await evaluate(`{ const row=[...document.querySelectorAll('.blocklyToolboxCategory')].find(r=>r.textContent.includes('Movement')); for (const type of ['pointerdown','pointerup','click']) row.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,isPrimary:true})); } 1`);
await sleep(800);
await shot("02b-toolbox-movement");
await evaluate(`{ const row=[...document.querySelectorAll('.blocklyToolboxCategory')].find(r=>r.textContent.includes('Movement')); for (const type of ['pointerdown','pointerup','click']) row.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,isPrimary:true})); Blockly.ContextMenu.hide(); } 1`);
await sleep(300);

// 3. More menu open with examples expanded
await evaluate(`document.getElementById('more').click(); document.getElementById('examplesList').open = true; 1`);
await sleep(400);
await shot("03-menu-examples");
await evaluate(`document.body.click(); document.getElementById('examplesList').open = false; 1`);

// 4. Connect menu open
await evaluate(`document.getElementById('connect').click(); 1`);
await sleep(600);
await shot("04-connect-menu");

// 5. Connected to demo robot, run the program
await evaluate(`document.getElementById('connectDemo').click(); 1`);
await sleep(1500);
await shot("05-connected");
await evaluate(`document.getElementById('run').click(); 1`);
await sleep(6000);
await shot("06-running");

// 6. Robot panel (program stopped, two sensors chosen so live values show)
await evaluate(`document.getElementById('stop').click(); 1`);
await sleep(1500);
await evaluate(`document.getElementById('robot').click(); 1`);
await sleep(1000);
await evaluate(`for (const [p,k] of [[1,'touch'],[3,'light'],[4,'distance']]) { const s=document.getElementById('sensorKind'+p); s.value=k; s.dispatchEvent(new Event('change')); } 1`);
await sleep(3000);
await shot("07-robot-panel");
await evaluate(`document.getElementById('robotClose').click(); 1`);
await sleep(500);

// 7. Show code panel
await evaluate(`document.getElementById('toggleCode').click(); 1`);
await sleep(800);
await shot("08-show-code");
await evaluate(`document.getElementById('toggleCode').click(); 1`);

// 8. Another example: avoid obstacles, and the toolbox open on Sensors
await evaluate(`[...document.querySelectorAll('#examplesList button')][1].click(); 1`);
await sleep(800);
await evaluate(`document.getElementById('status').textContent = ''; 1`);
await shot("09-example-obstacles");

// 9. German UI
await goto(`${BASE}?demo&lang=de`);
await evaluate(`document.getElementById('more').click(); document.getElementById('languageList').open = true; 1`);
await sleep(400);
await shot("10-language-german");

// 10. Tablet portrait
await setSize(800, 1100, true);
await goto(`${BASE}?demo&lang=en`);
await evaluate(`[...document.querySelectorAll('#examplesList button')][4].click(); 1`);
await sleep(800);
await evaluate(`document.getElementById('status').textContent = ''; 1`);
await shot("11-tablet");

ws.close(); chrome.kill();
