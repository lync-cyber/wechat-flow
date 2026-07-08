import { createHash } from "node:crypto";
/**
 * regression-guard: byte-level render invariance for all 5 built-in themes.
 *
 * Business rule: same Markdown + same themeId + no customCss → byte-for-byte identical output.
 * Any SHA-256 change flags a rendering difference; update baselines only for a deliberate,
 * approved rendering change (regenerate via `UPDATE_BASELINE=1`).
 */
import type { ThemeDefinition } from "@wechat-flow/contracts";
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

const THEMES: Record<string, ThemeDefinition> = {
  default: defaultTheme,
  magazine: magazineTheme,
  literary: literaryTheme,
  business: businessTheme,
  tech: techTheme,
};

// Current render baselines; regenerate via `UPDATE_BASELINE=1 pnpm vitest run <this file>`.
const BASELINE_HASHES: Record<string, string> = {
  default: "a6dadcd25458c3b1863bb6bb8be313ad1c796e78035cec71be222e125a55e9b3",
  magazine: "a1d7e7823742624060ed90e4aeb4e734dc5df3791a297d19f7a358f145b59d24",
  literary: "7e4396150bbe7cff39b11f5221b197e6b702faccbc99625663ffeaccad7107da",
  business: "5a99555d6ea5007397ea45f2d80093a7a3071c6590948502fd2f366103703c77",
  tech: "56ad086769f661ed6fbbeb052cda536f1d912ba65d3bba55d23fe3f34a16e957",
};

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

describe("regression-guard: themeBlocks migration byte-level render invariance (no customCss)", () => {
  for (const [name, theme] of Object.entries(THEMES)) {
    it(`${name} theme: render output matches SHA-256 baseline`, async () => {
      const result = await renderMarkdown(REPRESENTATIVE_MD, { theme });
      const hash = sha256(result.html);
      if (process.env.UPDATE_BASELINE) {
        console.log(`BASELINE[${name}] = "${hash}"`);
        return;
      }
      expect(
        hash,
        `${name} theme render hash changed — byte invariance broken.\nActual html (first 200 chars): ${result.html.slice(0, 200)}`
      ).toBe(BASELINE_HASHES[name]);
    });
  }
});
