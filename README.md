# MindBrick

Program old LEGO® Mindstorms® NXT bricks from a browser – on a laptop or an Android tablet, over USB or Bluetooth, with the stock firmware.

**Status: early prototype.** Right now there is a test page where you can write a text program (NXC), compile it inside the browser and send it to the brick; the block editor comes next.

**Try it:** https://ivannakramer.github.io/MindBrick/ (Chrome or Edge; Android needs Chrome 137+)

## What works today

- Connect to an NXT over USB (WebUSB) or Bluetooth (Web Serial) – tested on Linux and on an Android tablet
- Read brick info, beep, list files
- Upload a compiled program (`hello.rxe`) and start/stop it
- Compile NXC programs inside the browser – the NBC compiler runs as WebAssembly, no server involved (see `compiler/`)

For Bluetooth, pair the brick in your device's Bluetooth settings first (passkey `1234`).
On Linux, USB needs a udev rule once: `bash tools/install_udev.sh`.

## Folders

- `web/` – the browser app (`nxt.js` is the NXT protocol library, `nbc.js` + `nbc.wasm` the compiler)
- `compiler/` – how `nbc.wasm` is built and tested
- `examples/` – NXC example programs; compile with `nbc -O=hello.rxe hello.nxc`
- `tools/` – Python helper scripts for developers (need `nxt-python`)

## Test brick

Read over USB with `tools/probe_nxt.py` on 2026-09-21:

| | |
|---|---|
| Name | `NXT` |
| Firmware | **1.31** (stock LEGO, protocol 1.124) |
| Battery | 7.9 V |
| Free flash | 2504 bytes at first (almost full); about 40 KB after deleting four stock sound files |

## Disclaimer

Independent hobby project, inspired by modern block-based robot editors. LEGO® and MINDSTORMS® are trademarks of the LEGO Group, which does not sponsor, authorize or endorse this project.

Licensed under Apache 2.0. Bundled third-party parts keep their own licences: the NBC compiler in `web/nbc.wasm` (MPL 1.1, by John Hansen) and `web/vendor/` – see `compiler/README.md`.
