import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";

// decode-named-character-reference (a micromark dependency) ships a `browser`
// entry that touches `document` at module top level, which throws inside a Web
// Worker. Its node entry decodes identically without the DOM, so alias to it for
// both the browser main-thread and Web Worker targets.
const nodeRequire = createRequire(import.meta.url);
const decodeEntry = nodeRequire.resolve("decode-named-character-reference");

export default defineConfig({
  resolve: {
    alias: {
      "decode-named-character-reference": decodeEntry,
    },
  },
  test: {
    include: ["tests/cross-runtime/browser.test.ts", "tests/cross-runtime/worker.test.ts"],
    browser: {
      enabled: true,
      provider: "playwright",
      headless: true,
      name: "chromium",
    },
  },
});
