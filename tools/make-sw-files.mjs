// Writes web/sw-files.js: the list of files the service worker stores for offline use, plus a
// VERSION made from their contents.   npm run sw   (the test suite fails if this was forgotten)
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const web = fileURLToPath(new URL("../web/", import.meta.url));
const SKIP = [/^sw-files\.js$/, /^sw\.js$/, /^test\.html$/, /^hello\.rxe$/, /\.map$/, /LICENSE/, /README\.txt$/, /\.mp3$|\.wav$|\.ogg$|\.cur$/];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [relative(web, path).replaceAll("\\", "/")];
  });
}

export function swFilesSource() {
  const files = walk(web).filter((f) => !SKIP.some((s) => s.test(f))).sort();
  const hash = createHash("sha256");
  for (const f of files) hash.update(f).update(readFileSync(join(web, f)));
  const list = ["./", ...files.filter((f) => f !== "index.html")];
  return `// Written by tools/make-sw-files.mjs – do not edit by hand.\nconst VERSION = "${hash.digest("hex").slice(0, 12)}";\nconst FILES = ${JSON.stringify(list, null, 1)};\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(join(web, "sw-files.js"), swFilesSource());
  console.log("web/sw-files.js written");
}
