# MindBrick

Program old LEGO® Mindstorms® NXT bricks from a browser – on a laptop or an Android tablet, over USB or Bluetooth, with the stock firmware.

**Status: early prototype.** A block editor (inspired by modern block-based robot editors) where you snap a program together, press **Run on robot**, and the program is compiled inside the browser, sent to the brick and started. The robot then runs on its own.

**Try it:** https://ivannakramer.github.io/MindBrick/ (Chrome or Edge; Android needs Chrome 137+)

## Quick start

1. Switch on the NXT. For Bluetooth: pair it in your device's Bluetooth settings first (passkey `1234`). For USB: plug in the cable.
2. Open the link above in Chrome or Edge.
3. Press **Connect** and pick Bluetooth or USB, then choose your brick.
4. Build a program under the "when program starts" block.
5. Press **Run on robot**. The program also stays on the brick (My Files → Software files).

On Linux, USB needs a udev rule once: `bash tools/install_udev.sh`. On Windows, USB needs the WinUSB driver (install with Zadig); Bluetooth needs no driver.

## What works today

- Block editor with motors, movement (motors B + C), sound, display, control (loops, if/else, wait until), sensors (touch, light, ultrasonic, sound, brick buttons, rotation, timer), operators and variables
- English and German (⋯ → Language); the browser's language is used at first
- Example programs (⋯ → Examples): drive a square, avoid obstacles, follow a line, clap to start, play a melody
- **Robot panel** (the gauge button): live sensor and motor values – handy for finding the right threshold – and the programs on the brick with Run / Delete and free memory
- "Show code" panel with the NXC code made from the blocks; problems are shown on the block that caused them
- Programs are saved in the browser automatically and can be saved to / opened from a file
- The NBC compiler runs as WebAssembly inside the page – no server, no installation (see `compiler/`)
- Connection over Bluetooth (Web Serial) or USB (WebUSB), with "last robot" shortcuts that skip the chooser – tested on Linux and on an Android tablet
- **Works offline** after the first visit and can be installed like an app (browser menu → "Install app" / "Add to home screen")
- **Demo robot**: add `?demo` to the address to try everything without hardware
- A developer test page (`test.html`) with brick info, file list and a plain NXC text editor

## Folders

- `web/` – the app, no build step: `index.html` + `app.js` (editor page), `blocks.js` (block definitions, toolbox, block texts), `generator.js` (blocks → NXC), `i18n.js` (page texts), `examples.js`, `nbc.js` + `nbc.wasm` (compiler), `nxt.js` (NXT protocol over USB/Bluetooth), `mock-brick.js` (the demo robot), `sw.js` (offline support), `vendor/` (Blockly and a WASI shim, unmodified)
- `compiler/` – how `nbc.wasm` is built and tested
- `test/` – tests for the generator (every generated program is really compiled), the NXT protocol (against a pretend brick), translations and examples: `npm install && npm test`. After changing anything in `web/`, run `npm run sw` to refresh the offline file list
- `examples/` – NXC example programs
- `tools/` – helper scripts for developers (Python ones need `nxt-python`); `npm run vendor` refreshes `web/vendor/blockly`

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

Licensed under Apache 2.0. Bundled third-party parts keep their own licences: the NBC compiler in `web/nbc.wasm` (MPL 1.1, by John Hansen, see `compiler/README.md`), Blockly (Apache 2.0) and browser_wasi_shim (MIT OR Apache 2.0) in `web/vendor/`.
