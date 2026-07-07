import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../../packages/core/src/index.ts";
import businessTheme from "../../../packages/themes/business/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";
import literaryTheme from "../../../packages/themes/literary/src/index.ts";
import magazineTheme from "../../../packages/themes/magazine/src/index.ts";
import techTheme from "../../../packages/themes/tech/src/index.ts";

const STRONG_MD = "这是一段包含**加粗强调**文字的段落。";

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

function extractStrongStyle(html: string): Record<string, string> {
  const match = html.match(/<strong[^>]*style="([^"]*)"/);
  expect(match, `no <strong style="..."> found in html: ${html.slice(0, 300)}`).not.toBeNull();
  return parseDeclarations(match?.[1] ?? "");
}

describe("AC-001: default 主题 strong 计算字重", () => {
  it("font-weight 计算值 = 600", async () => {
    const result = await renderMarkdown(STRONG_MD, { theme: defaultTheme });
    const style = extractStrongStyle(result.html);
    expect(style["font-weight"]).toBe("600");
  });
});

describe("AC-002: business 主题 strong 计算字重", () => {
  it("font-weight 计算值 = 700", async () => {
    const result = await renderMarkdown(STRONG_MD, { theme: businessTheme });
    const style = extractStrongStyle(result.html);
    expect(style["font-weight"]).toBe("700");
  });
});

describe("AC-003: literary 主题 strong 计算字重", () => {
  it("font-weight 计算值 = 500", async () => {
    const result = await renderMarkdown(STRONG_MD, { theme: literaryTheme });
    const style = extractStrongStyle(result.html);
    expect(style["font-weight"]).toBe("500");
  });
});

describe("AC-004: magazine 主题 strong 计算字重", () => {
  it("font-weight 计算值 = 700", async () => {
    const result = await renderMarkdown(STRONG_MD, { theme: magazineTheme });
    const style = extractStrongStyle(result.html);
    expect(style["font-weight"]).toBe("700");
  });
});

describe("AC-005: tech 主题 strong 计算字重", () => {
  it("font-weight 计算值 = 600", async () => {
    const result = await renderMarkdown(STRONG_MD, { theme: techTheme });
    const style = extractStrongStyle(result.html);
    expect(style["font-weight"]).toBe("600");
  });
});
