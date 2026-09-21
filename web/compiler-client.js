// compiler-client.js – the page-side half of the compiler: sends NXC source to the worker
// (nbc-worker.js) and returns a promise with the result, so the page never freezes while compiling.
export function createCompilerClient() {
  const worker = new Worker(new URL("./nbc-worker.js", import.meta.url), { type: "module" });
  const waiting = new Map();
  let nextId = 1;
  worker.onmessage = ({ data }) => {
    const { resolve, reject } = waiting.get(data.id);
    waiting.delete(data.id);
    if (data.error) reject(new Error(data.error));
    else resolve(data.result);
  };
  // Resolves to { ok, rxe, errors: [{ kind, message, line }], log, ms }
  return function compile(source) {
    return new Promise((resolve, reject) => {
      waiting.set(nextId, { resolve, reject });
      worker.postMessage({ id: nextId++, source });
    });
  };
}
