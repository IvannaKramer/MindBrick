// Compiles every program in test/programs with the native nbc and with nbc.wasm (in Node's WASI)
// and checks that both produce exactly the same .rxe bytes and the same error messages.
//
//   node compiler/test/compare.mjs path/to/nbc.wasm
import { WASI } from "node:wasi";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, mkdtempSync, copyFileSync, existsSync, openSync, closeSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const wasmPath = process.argv[2] ?? join(here, "../../web/nbc.wasm");
const module = await WebAssembly.compile(readFileSync(wasmPath));

function runWasm(dir, args) {
  const out = join(dir, "stdout.txt");
  const fd = openSync(out, "w");
  const wasi = new WASI({ version: "preview1", args: ["nbc", ...args], preopens: { "/work": dir }, stdout: fd, stderr: fd, returnOnExit: true });
  const began = performance.now();
  let code;
  try {
    const instance = new WebAssembly.Instance(module, wasi.getImportObject());
    code = wasi.start(instance);
  } finally {
    closeSync(fd);
  }
  return { code, ms: Math.round(performance.now() - began), text: readFileSync(out, "utf8") };
}

function runNative(dir, name) {
  try {
    execFileSync("nbc", [`-O=${join(dir, "native.rxe")}`, `-E=${join(dir, "native.err")}`, join(dir, name)], { stdio: "pipe" });
    return 0;
  } catch (e) {
    return e.status;
  }
}

let failures = 0;
for (const name of readdirSync(join(here, "programs")).filter((n) => n.endsWith(".nxc"))) {
  const dir = mkdtempSync(join(tmpdir(), "nbc-"));
  copyFileSync(join(here, "programs", name), join(dir, name));
  const nativeCode = runNative(dir, name);
  const wasm = runWasm(dir, ["-O=/work/wasm.rxe", "-E=/work/wasm.err", `/work/${name}`]);
  const read = (f) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f)) : null);
  const [n, w] = [read("native.rxe"), read("wasm.rxe")];
  const sameRxe = n === null ? w === null : w !== null && n.equals(w);
  // NBC names the file in its messages after the output file, so make both runs look alike.
  const strip = (b) => (b ? b.toString().replaceAll(dir, "").replaceAll("/work", "").replace(/\b(native|wasm)\.nxc/g, "program.nxc") : "");
  const sameErr = strip(read("native.err")) === strip(read("wasm.err"));
  const ok = sameRxe && sameErr && (nativeCode === 0) === (wasm.code === 0);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(18)} native exit ${nativeCode}, wasm exit ${wasm.code} in ${wasm.ms} ms, rxe ${n?.length ?? "-"} / ${w?.length ?? "-"} bytes, errors ${sameErr ? "match" : "DIFFER"}`);
  if (!ok) console.log(wasm.text.slice(-1500), "\n--- wasm.err:\n", strip(read("wasm.err")).slice(0, 800), "\n--- native.err:\n", strip(read("native.err")).slice(0, 800));
}
process.exit(failures ? 1 : 0);
