import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../../packages/core/src/index.ts";
import businessTheme from "../../../packages/themes/business/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";
import literaryTheme from "../../../packages/themes/literary/src/index.ts";
import magazineTheme from "../../../packages/themes/magazine/src/index.ts";
import techTheme from "../../../packages/themes/tech/src/index.ts";

const TABLE_MD = "| A | B |\n|---|---|\n| r1c1 | r1c2 |\n| r2c1 | r2c2 |\n| r3c1 | r3c2 |";

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

describe("AC-001: default 主题表格视觉规格", () => {
  it("table 计算样式 border-collapse: collapse", async () => {
    const result = await renderMarkdown(TABLE_MD, { theme: defaultTheme });
    const style = extractStyle(result.html, "table");
    expect(style["border-collapse"]).toBe("collapse");
  });

  it("th 背景色计算值 = --color-surface-alt 实值，字重计算值 600", async () => {
    const result = await renderMarkdown(TABLE_MD, { theme: defaultTheme });
    const style = extractStyle(result.html, "th");
    expect(style["background-color"]).toBe("#f3f0eb");
    expect(style["font-weight"]).toBe("600");
  });

  it("td 四边 border 计算值含 --color-border 实值", async () => {
    const result = await renderMarkdown(TABLE_MD, { theme: defaultTheme });
    const style = extractStyle(result.html, "td");
    expect(style.border).toContain("#d6d3ce");
  });
});

describe("AC-002: business 主题表格视觉规格", () => {
  it("th 背景计算值 = --color-brand，文字色计算值 = --color-text-inverse，无边框", async () => {
    const result = await renderMarkdown(TABLE_MD, { theme: businessTheme });
    const style = extractStyle(result.html, "th");
    expect(style["background-color"]).toBe("#1a4f8a");
    expect(style.color).toBe("#ffffff");
    expect(style.border).toBe("none");
  });

  it("td 偶数行背景计算值 = --color-surface-alt（斑马纹生效）", async () => {
    const result = await renderMarkdown(TABLE_MD, { theme: businessTheme });
    const oddRowStyle = extractStyle(result.html, "td", 0);
    const evenRowStyle = extractStyle(result.html, "td", 2);
    expect(evenRowStyle["background-color"]).toBe("#eef2f7");
    expect(oddRowStyle["background-color"]).not.toBe("#eef2f7");
  });
});

describe("AC-003: literary 主题表格视觉规格", () => {
  it("th 背景计算值透明，仅 border-bottom 计算值含 --color-border-strong", async () => {
    const result = await renderMarkdown(TABLE_MD, { theme: literaryTheme });
    const style = extractStyle(result.html, "th");
    expect(style["background-color"]).toBe("transparent");
    expect(style["border-bottom"]).toContain("#b8a882");
  });

  it("无斑马纹——偶数行背景计算值与奇数行一致", async () => {
    const result = await renderMarkdown(TABLE_MD, { theme: literaryTheme });
    const oddRowStyle = extractStyle(result.html, "td", 0);
    const evenRowStyle = extractStyle(result.html, "td", 2);
    expect(evenRowStyle["background-color"]).toBe(oddRowStyle["background-color"]);
  });
});

describe("AC-004: magazine 主题表格视觉规格", () => {
  it("th 仅 border-bottom 计算值 2px solid 含 --color-brand", async () => {
    const result = await renderMarkdown(TABLE_MD, { theme: magazineTheme });
    const style = extractStyle(result.html, "th");
    expect(style["border-bottom"]).toBe("2px solid #d4521a");
  });
});

describe("AC-005: tech 主题表格视觉规格", () => {
  it("th/td padding 计算值为紧凑型 6px 10px", async () => {
    const result = await renderMarkdown(TABLE_MD, { theme: techTheme });
    const thStyle = extractStyle(result.html, "th");
    const tdStyle = extractStyle(result.html, "td");
    expect(thStyle.padding).toBe("6px 10px");
    expect(tdStyle.padding).toBe("6px 10px");
  });

  it("td 偶数行背景计算值 = --color-background（斑马纹生效）", async () => {
    const result = await renderMarkdown(TABLE_MD, { theme: techTheme });
    const oddRowStyle = extractStyle(result.html, "td", 0);
    const evenRowStyle = extractStyle(result.html, "td", 2);
    expect(evenRowStyle["background-color"]).toBe("#0f1117");
    expect(oddRowStyle["background-color"]).not.toBe("#0f1117");
  });
});
