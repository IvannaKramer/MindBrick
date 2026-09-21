# The NXC compiler, as WebAssembly

`web/nbc.wasm` is the original **NBC/NXC compiler 1.2.1.r4** by John Hansen – the same program as the
`nbc` command line tool – compiled to WebAssembly so it can run inside a web page. MindBrick uses it to
turn NXC source code into `.rxe` programs for the NXT without a server and without installing anything.

## How it fits together

| File | What it does |
|---|---|
| `compiler/Dockerfile` | Builds the Free Pascal WebAssembly cross-compiler, compiles NBC with it, shrinks the result with `wasm-opt` |
| `compiler/patches/` | Our changes to NBC's source (none needed so far) |
| `compiler/test/compare.mjs` | Compiles test programs with native `nbc` and with `nbc.wasm`; both must give byte-identical `.rxe` files and identical error messages |
| `web/nbc.wasm` | The build result (about 3.5 MB, 680 KB when served gzipped) |
| `web/nbc.js` | `createCompiler()` → `compileNxc(source)` → `{ ok, rxe, errors, log }`; gives NBC an in-memory file system through a WASI shim |
| `web/nbc-worker.js` | Runs `nbc.js` in a Web Worker so the page stays responsive |

## Rebuilding

Needs Docker; nothing is installed on your machine. The first build takes 15–20 minutes (it builds Free Pascal).

```
docker build -t mindbrick-nbc compiler/
docker run --rm mindbrick-nbc cat /out/nbc.wasm > web/nbc.wasm
node compiler/test/compare.mjs      # needs the native nbc too: sudo apt install nbc
```

## Known quirks

- Every compile takes about a second on a laptop, even for tiny programs, because NBC parses its large
  built-in header (`NXCDefs.h`) each time.
- NBC sometimes reports an error one line late (a missing `;` is noticed at the next token).
- The `.rxe` targets standard firmware 1.28+ (NBC's default); the enhanced NBC/NXC firmware is not required.

## Licences

- NBC is licensed under the Mozilla Public License 1.1 (so are `test/programs/nbc_*.nxc`, copied from its test folder). Source: <https://github.com/pierre-24/nbc-compiler>
  (a fork of <https://sourceforge.net/projects/bricxcc/> that builds with current Free Pascal) at the commit
  pinned in the Dockerfile, plus anything in `patches/`.
- The Free Pascal runtime library linked into `nbc.wasm` is LGPL with a static linking exception.
- `web/vendor/browser_wasi_shim` is MIT OR Apache-2.0.
