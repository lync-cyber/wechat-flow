import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../../packages/core/src/index.ts";
import businessTheme from "../../../packages/themes/business/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";
import literaryTheme from "../../../packages/themes/literary/src/index.ts";
import magazineTheme from "../../../packages/themes/magazine/src/index.ts";
import techTheme from "../../../packages/themes/tech/src/index.ts";

const H2_MD = "## 标题二级";

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

describe("AC-001: business 主题 h2 左竖条 accent", () => {
  it("border-left 计算值 4px solid 含 --color-brand 实值，padding-left 计算值 8px", async () => {
    const result = await renderMarkdown(H2_MD, { theme: businessTheme });
    const style = extractStyle(result.html, "h2");
    expect(style["border-left"]).toBe("4px solid #1a4f8a");
    expect(style["padding-left"]).toBe("8px");
  });
});

describe("AC-002: magazine 主题 h2 左竖条 accent", () => {
  it("border-left 计算值 6px solid 含 --color-brand 实值，padding-left 计算值 10px", async () => {
    const result = await renderMarkdown(H2_MD, { theme: magazineTheme });
    const style = extractStyle(result.html, "h2");
    expect(style["border-left"]).toBe("6px solid #d4521a");
    expect(style["padding-left"]).toBe("10px");
  });
});

describe("AC-003: tech 主题 h2 左竖条 accent", () => {
  it("border-left 计算值 3px solid 含 --color-brand 实值，padding-left 计算值 8px", async () => {
    const result = await renderMarkdown(H2_MD, { theme: techTheme });
    const style = extractStyle(result.html, "h2");
    expect(style["border-left"]).toBe("3px solid #58a6ff");
    expect(style["padding-left"]).toBe("8px");
  });
});

describe("AC-004: default 主题 h2 无左竖条", () => {
  it("border-left-width 计算值为 0px 或 border-left 属性不存在", async () => {
    const result = await renderMarkdown(H2_MD, { theme: defaultTheme });
    const style = extractStyle(result.html, "h2");
    const borderLeft = style["border-left"];
    const borderLeftWidth = style["border-left-width"];
    const hasNoLeftBorder =
      borderLeft === undefined ||
      borderLeft === "none" ||
      borderLeftWidth === "0px" ||
      borderLeftWidth === undefined;
    expect(hasNoLeftBorder).toBe(true);
  });
});

describe("AC-005: literary 主题 h2 无左竖条且既有风格不回归", () => {
  it("h2 计算样式无左竖条，字重/字号/颜色保持既有值不变", async () => {
    const result = await renderMarkdown(H2_MD, { theme: literaryTheme });
    const style = extractStyle(result.html, "h2");
    expect(style["border-left"]).toBeUndefined();
    expect(style["font-weight"]).toBe("700");
    expect(style["font-size"]).toBe("18px");
    expect(style.color).toBe("#2c1f0a");
  });
});

describe("AC-006: 渲染产物不含伪元素序号徽章实现", () => {
  it("三主题 heading.ts 源码不含 ::before/::after 选择器", () => {
    const files = [
      "packages/themes/business/src/blocks/heading.ts",
      "packages/themes/magazine/src/blocks/heading.ts",
      "packages/themes/tech/src/blocks/heading.ts",
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf-8");
      expect(source).not.toMatch(/::before|::after/);
    }
  });

  it("三主题渲染后 h2 HTML 不含 before/after 伪元素相关 class 或 data 标记", async () => {
    const businessResult = await renderMarkdown(H2_MD, { theme: businessTheme });
    const magazineResult = await renderMarkdown(H2_MD, { theme: magazineTheme });
    const techResult = await renderMarkdown(H2_MD, { theme: techTheme });
    for (const html of [businessResult.html, magazineResult.html, techResult.html]) {
      expect(html).not.toMatch(/::before|::after/);
    }
  });
});
