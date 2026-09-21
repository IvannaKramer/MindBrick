// Copies the Blockly files the web app needs from node_modules into web/vendor/blockly,
// so the app works without a build step, without a CDN and offline.
//   npm install && npm run vendor
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";

const from = new URL("../node_modules/blockly/", import.meta.url);
const to = new URL("../web/vendor/blockly/", import.meta.url);
rmSync(to, { recursive: true, force: true });
mkdirSync(new URL("msg/", to), { recursive: true });
for (const file of ["blockly_compressed.js", "blocks_compressed.js", "msg/en.js", "msg/de.js", "LICENSE"]) {
  cpSync(new URL(file, from), new URL(file, to));
}
cpSync(new URL("media/", from), new URL("media/", to), { recursive: true });
const { version } = JSON.parse(readFileSync(new URL("package.json", from)));
writeFileSync(new URL("README.txt", to), `Blockly ${version} (https://github.com/google/blockly), Apache-2.0, copied unmodified from the npm package by tools/vendor-blockly.mjs.\n`);
console.log(`Blockly ${version} copied to web/vendor/blockly`);
