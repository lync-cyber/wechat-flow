/**
 * regression-guard: byte-level render invariance for all 5 built-in themes.
 *
 * These tests MUST remain GREEN after the T-118 3-layer themeBlocks migration.
 * Any change to the SHA-256 hash indicates a byte-level rendering difference,
 * which violates the business rule: same Markdown + same themeId + no customCss
 * → output must be byte-for-byte identical to pre-migration output.
 *
 * Baseline hashes captured from the pre-migration codebase.
 * Do NOT update these hashes unless a deliberate rendering change is intentional
 * and separately approved.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../packages/core/src/index.ts";
import businessTheme from "../../packages/themes/business/src/index.ts";
import defaultTheme from "../../packages/themes/default/src/index.ts";
import literaryTheme from "../../packages/themes/literary/src/index.ts";
import magazineTheme from "../../packages/themes/magazine/src/index.ts";
import techTheme from "../../packages/themes/tech/src/index.ts";

// Representative Markdown covering h1/h2/p/quote/code/divider
const REPRESENTATIVE_MD = `# 一级标题

## 二级标题

这是一段普通段落，包含**粗体**和*斜体*文字。

> 这是一段引用内容，用于测试 blockquote 样式

\`\`\`
const code = 'code block';
\`\`\`

---
`;

// Pre-migration baseline SHA-256 hashes (captured from codebase before T-118 migration)
const BASELINE_HASHES: Record<string, string> = {
  default: "95b8ef48c3213ff424f0b6f1d89e33eb22eaa80474823a48cf1e0e911333cf14",
  magazine: "79f217c955ef90335e9b787b211b95bb3dc8b63d358d4fd8325f883dd551d928",
  literary: "08b331e97fa36f8850970814b0065075123e0b83f071808a291f5ee0d1bf466c",
  business: "3c5b0da98d9929951ab686f43828ce511340790e8e02b0e5abe6ff35e59d5a58",
  tech: "44c9501ff2c816b7d421c545305ff4081588f1d2f9461ae0dd12ebd7223d3b3e",
};

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

describe("regression-guard: themeBlocks migration byte-level render invariance (no customCss)", () => {
  it("default theme: render output matches pre-migration SHA-256 baseline", async () => {
    const result = await renderMarkdown(REPRESENTATIVE_MD, { theme: defaultTheme });
    const hash = sha256(result.html);
    expect(
      hash,
      `default theme render hash changed — migration broke byte invariance.\nActual html (first 200 chars): ${result.html.slice(0, 200)}`
    ).toBe(BASELINE_HASHES.default);
  });

  it("magazine theme: render output matches pre-migration SHA-256 baseline", async () => {
    const result = await renderMarkdown(REPRESENTATIVE_MD, { theme: magazineTheme });
    const hash = sha256(result.html);
    expect(
      hash,
      `magazine theme render hash changed — migration broke byte invariance.\nActual html (first 200 chars): ${result.html.slice(0, 200)}`
    ).toBe(BASELINE_HASHES.magazine);
  });

  it("literary theme: render output matches pre-migration SHA-256 baseline", async () => {
    const result = await renderMarkdown(REPRESENTATIVE_MD, { theme: literaryTheme });
    const hash = sha256(result.html);
    expect(
      hash,
      `literary theme render hash changed — migration broke byte invariance.\nActual html (first 200 chars): ${result.html.slice(0, 200)}`
    ).toBe(BASELINE_HASHES.literary);
  });

  it("business theme: render output matches pre-migration SHA-256 baseline", async () => {
    const result = await renderMarkdown(REPRESENTATIVE_MD, { theme: businessTheme });
    const hash = sha256(result.html);
    expect(
      hash,
      `business theme render hash changed — migration broke byte invariance.\nActual html (first 200 chars): ${result.html.slice(0, 200)}`
    ).toBe(BASELINE_HASHES.business);
  });

  it("tech theme: render output matches pre-migration SHA-256 baseline", async () => {
    const result = await renderMarkdown(REPRESENTATIVE_MD, { theme: techTheme });
    const hash = sha256(result.html);
    expect(
      hash,
      `tech theme render hash changed — migration broke byte invariance.\nActual html (first 200 chars): ${result.html.slice(0, 200)}`
    ).toBe(BASELINE_HASHES.tech);
  });
});
