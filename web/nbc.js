// nbc.js – run the NBC/NXC compiler (nbc.wasm) and get an .rxe program back.
//
// nbc.wasm is the original NBC 1.2.1.r4 command line compiler by John Hansen (MPL 1.1),
// built for WebAssembly/WASI; see compiler/ in the repository. It expects files and
// command line arguments, so we hand it a tiny in-memory file system through a WASI shim.
import { WASI, File, OpenFile, PreopenDirectory, ConsoleStdout } from "./vendor/browser_wasi_shim/index.js";

// Compile the WebAssembly once; each NXC compile then only needs a cheap new instance.
export async function createCompiler(wasmBytesOrResponse) {
  const module = wasmBytesOrResponse instanceof Response || wasmBytesOrResponse instanceof Promise
    ? await WebAssembly.compileStreaming(wasmBytesOrResponse)
    : await WebAssembly.compile(wasmBytesOrResponse);

  // Returns { ok, rxe (Uint8Array or null), errors: [{message, line}], log }
  return async function compileNxc(source, { optimize = 1 } = {}) {
    const began = performance.now();
    const log = [];
    const work = new PreopenDirectory("/work", new Map([["program.nxc", new File(new TextEncoder().encode(source))]]));
    const fds = [
      new OpenFile(new File([])), // stdin: empty
      ConsoleStdout.lineBuffered((line) => log.push(line)),
      ConsoleStdout.lineBuffered((line) => log.push(line)),
      work,
    ];
    const args = ["nbc", `-Z${optimize}`, "-O=/work/program.rxe", "-E=/work/errors.txt", "/work/program.nxc"];
    const wasi = new WASI(args, [], fds, { debug: false });
    const instance = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: wasi.wasiImport });
    const exitCode = wasi.start(instance);

    const file = (name) => work.dir.contents.get(name)?.data ?? null;
    const errorText = file("errors.txt") ? new TextDecoder().decode(file("errors.txt")) : "";
    const rxe = exitCode === 0 ? file("program.rxe") : null;
    return { ok: rxe !== null, rxe, errors: parseErrors(errorText), log, ms: Math.round(performance.now() - began) };
  };
}

// NBC reports problems as blocks like:
//   # Error: ';' expected
//   File "/work/program.nxc" ; line 4
//   #    Wait(
//   #----------------------------------------------------------
export function parseErrors(text) {
  const errors = [];
  const pattern = /^# (Error|Warning): (.*)\r?\nFile "[^"]*" ; line (\d+)/gm;
  for (const m of text.matchAll(pattern)) {
    errors.push({ kind: m[1].toLowerCase(), message: m[2].trim(), line: Number(m[3]) });
  }
  return errors;
}
