import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../../packages/core/src/index.ts";
import businessTheme from "../../../packages/themes/business/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";
import literaryTheme from "../../../packages/themes/literary/src/index.ts";
import { tokens as literaryTokens } from "../../../packages/themes/literary/src/tokens.ts";
import magazineTheme from "../../../packages/themes/magazine/src/index.ts";
import techTheme from "../../../packages/themes/tech/src/index.ts";

const CODE_BLOCK_MD = "```js\nconst x = 1;\n```\n\nUse `inline code` here.";

function parseDeclarations(style: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const decl of style.split(";")) {
    const trimmed = decl.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const prop = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    out[prop] = value;
  }
  return out;
}

function extractStyle(html: string, tag: string, nth = 0): Record<string, string> {
  const re = new RegExp(`<${tag}[^>]*style="([^"]*)"`, "g");
  const matches = [...html.matchAll(re)];
  expect(
    matches.length,
    `expected at least ${nth + 1} <${tag}> with style in html`
  ).toBeGreaterThan(nth);
  return parseDeclarations(matches[nth][1]);
}

describe("AC-001: tech 主题 pre/code 背景一致（暗底）", () => {
  it("pre 计算背景色 = --color-code-block-bg 实值，与 inline code 计算背景色一致", async () => {
    const result = await renderMarkdown(CODE_BLOCK_MD, { theme: techTheme });
    const preStyle = extractStyle(result.html, "pre");
    const codeStyle = extractStyle(result.html, "code");
    expect(preStyle["background-color"]).toBe("#1a1a2e");
    expect(preStyle["background-color"]).toBe(codeStyle["background-color"]);
  });
});

describe("AC-002: default/business/magazine 主题 pre/code 背景一致（同值不同 token）", () => {
  it("default: pre 计算背景色 = #f0ede8，与 inline code 一致", async () => {
    const result = await renderMarkdown(CODE_BLOCK_MD, { theme: defaultTheme });
    const preStyle = extractStyle(result.html, "pre");
    const codeStyle = extractStyle(result.html, "code");
    expect(preStyle["background-color"]).toBe("#f0ede8");
    expect(preStyle["background-color"]).toBe(codeStyle["background-color"]);
  });

  it("business: pre 计算背景色 = #eef2f7，与 inline code 一致", async () => {
    const result = await renderMarkdown(CODE_BLOCK_MD, { theme: businessTheme });
    const preStyle = extractStyle(result.html, "pre");
    const codeStyle = extractStyle(result.html, "code");
    expect(preStyle["background-color"]).toBe("#eef2f7");
    expect(preStyle["background-color"]).toBe(codeStyle["background-color"]);
  });

  it("magazine: pre 计算背景色 = #fff3e8，与 inline code 一致", async () => {
    const result = await renderMarkdown(CODE_BLOCK_MD, { theme: magazineTheme });
    const preStyle = extractStyle(result.html, "pre");
    const codeStyle = extractStyle(result.html, "code");
    expect(preStyle["background-color"]).toBe("#fff3e8");
    expect(preStyle["background-color"]).toBe(codeStyle["background-color"]);
  });
});

describe("AC-003: literary 主题 pre 暖米亮底 + border/border-radius 主题化", () => {
  it("pre 计算背景色 = #f2ece0，border 计算值含 --color-border，border-radius 计算值含 --decoration-border-radius-sm", async () => {
    const result = await renderMarkdown(CODE_BLOCK_MD, { theme: literaryTheme });
    const preStyle = extractStyle(result.html, "pre");
    expect(preStyle["background-color"]).toBe("#f2ece0");
    expect(preStyle.border).toContain("#ddd4c0");
    expect(preStyle["border-radius"]).toBe("2px");
  });
});

describe("AC-004: pre 消费 --color-code-block-bg token 引用（非直接复用 --color-code-bg 字面值）", () => {
  it("修改 --color-code-block-bg 后 pre 计算背景色随之变化", async () => {
    const original = literaryTokens["--color-code-block-bg"];
    try {
      literaryTokens["--color-code-block-bg"] = "#123456";
      const result = await renderMarkdown(CODE_BLOCK_MD, { theme: literaryTheme });
      const preStyle = extractStyle(result.html, "pre");
      expect(preStyle["background-color"]).toBe("#123456");
    } finally {
      literaryTokens["--color-code-block-bg"] = original;
    }
  });
});
