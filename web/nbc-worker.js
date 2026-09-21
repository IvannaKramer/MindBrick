// Runs the compiler off the main thread so the page stays responsive on slow tablets.
// Message in:  { id, source, options }     Message out: { id, result } or { id, error }
import { createCompiler } from "./nbc.js";

const compiler = createCompiler(fetch(new URL("./nbc.wasm", import.meta.url)));

self.onmessage = async ({ data }) => {
  try {
    const compileNxc = await compiler;
    const result = await compileNxc(data.source, data.options);
    self.postMessage({ id: data.id, result });
  } catch (e) {
    self.postMessage({ id: data.id, error: String(e?.message ?? e) });
  }
};
