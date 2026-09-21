// Tests for translations and example programs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as Blockly from "blockly";
import { defineBlocks, MESSAGES, starterWorkspace } from "../web/blocks.js";
import { createNxcGenerator } from "../web/generator.js";
import { createCompiler } from "../web/nbc.js";
import { EXAMPLES } from "../web/examples.js";
import { LANGUAGES, createTranslator } from "../web/i18n.js";

defineBlocks(Blockly);
const generate = createNxcGenerator(Blockly);
const compile = await createCompiler(readFileSync(new URL("../web/nbc.wasm", import.meta.url)));

test("every language has every block text, with the same %1 %2 … sockets", () => {
  const sockets = (s) => (s.match(/%\d/g) ?? []).sort().join(" ");
  for (const language of Object.keys(LANGUAGES)) {
    for (const [key, english] of Object.entries(MESSAGES.en)) {
      assert.ok(MESSAGES[language][key], `${language} is missing ${key}`);
      assert.equal(sockets(MESSAGES[language][key]), sockets(english), `${language} ${key} has different sockets`);
    }
  }
});

test("every language has every page text, with the same {0} {1} … values", () => {
  const source = readFileSync(new URL("../web/i18n.js", import.meta.url), "utf8");
  const keys = [...source.slice(source.indexOf("en: {"), source.indexOf("  de: {")).matchAll(/^\s{4}(\w+):|, (\w+): "/gm)].map((m) => m[1] ?? m[2]);
  assert.ok(keys.length > 50);
  const english = createTranslator("en");
  const values = (s) => (s.match(/\{\d\}/g) ?? []).sort().join(" ");
  for (const language of Object.keys(LANGUAGES)) {
    const t = createTranslator(language);
    for (const key of keys) {
      if (language !== "en") assert.notEqual(t(key), key, `${language} is missing ${key}`);
      assert.equal(values(t(key)), values(english(key)), `${language} ${key} uses different values`);
    }
  }
});

test("every example and the starter program compile in every language", async () => {
  for (const language of Object.keys(LANGUAGES)) {
    for (const example of [{ id: "starter", name: LANGUAGES, build: starterWorkspace }, ...EXAMPLES]) {
      assert.ok(example.name[language], `${example.id} has no ${language} name`);
      const ws = new Blockly.Workspace();
      Blockly.serialization.workspaces.load(example.build(language), ws);
      const { code, problems } = generate(ws);
      assert.deepEqual(problems, [], example.id);
      const result = await compile(code);
      assert.ok(result.ok, `${example.id} (${language}):\n${JSON.stringify(result.errors)}\n${code}`);
    }
  }
});

test("web/sw-files.js is up to date (run `npm run sw` after changing anything in web/)", async () => {
  const { swFilesSource } = await import("../tools/make-sw-files.mjs");
  assert.equal(readFileSync(new URL("../web/sw-files.js", import.meta.url), "utf8"), swFilesSource());
});
