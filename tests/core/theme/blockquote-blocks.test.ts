import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../../packages/core/src/index.ts";
import businessTheme from "../../../packages/themes/business/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";
import literaryTheme from "../../../packages/themes/literary/src/index.ts";
import magazineTheme from "../../../packages/themes/magazine/src/index.ts";
import techTheme from "../../../packages/themes/tech/src/index.ts";

const QUOTE_MD = "> 这是一段引用内容，用于测试 blockquote 样式";

function extractBlockquoteStyle(html: string): string {
  const match = html.match(/<blockquote[^>]*style="([^"]*)"/);
  expect(match, `no <blockquote style="..."> found in html: ${html.slice(0, 300)}`).not.toBeNull();
  return match?.[1] ?? "";
}

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

describe("AC-001: business 主题 blockquote 双侧细线无底色", () => {
  it("border-left 与 border-right 均为 1px solid #1a4f8a，background-color 为 transparent", async () => {
    const result = await renderMarkdown(QUOTE_MD, { theme: businessTheme });
    const style = parseDeclarations(extractBlockquoteStyle(result.html));
    expect(style["border-left"]).toBe("1px solid #1a4f8a");
    expect(style["border-right"]).toBe("1px solid #1a4f8a");
    expect(style["background-color"]).toBe("transparent");
  });
});

describe("AC-002: literary 主题 blockquote 去斜体 + 字距", () => {
  it("font-style 不为 italic，color 为 #5a4228，letter-spacing 为 1.2px", async () => {
    const result = await renderMarkdown(QUOTE_MD, { theme: literaryTheme });
    const style = parseDeclarations(extractBlockquoteStyle(result.html));
    expect(style["font-style"]).not.toBe("italic");
    expect(style.color).toBe("#5a4228");
    expect(style["letter-spacing"]).toBe("1.2px");
  });
});

describe("AC-003: magazine 主题 blockquote 大字拉引感", () => {
  it("font-size 为正文 16px 的 1.15em 换算值 18.4px，border-left 为 3px solid #d4521a", async () => {
    const result = await renderMarkdown(QUOTE_MD, { theme: magazineTheme });
    const style = parseDeclarations(extractBlockquoteStyle(result.html));
    expect(style["font-size"]).toBe("18.4px");
    expect(style["border-left"]).toBe("3px solid #d4521a");
  });
});

describe("AC-004: tech 主题 blockquote 简洁竖条", () => {
  it("border-left 为 3px solid #58a6ff，background-color 为 transparent", async () => {
    const result = await renderMarkdown(QUOTE_MD, { theme: techTheme });
    const style = parseDeclarations(extractBlockquoteStyle(result.html));
    expect(style["border-left"]).toBe("3px solid #58a6ff");
    expect(style["background-color"]).toBe("transparent");
  });
});

describe("AC-005: default 主题 blockquote 现状微调", () => {
  it("border-left 为 4px solid #2d5a4e，background-color 含 #f3f0eb", async () => {
    const result = await renderMarkdown(QUOTE_MD, { theme: defaultTheme });
    const style = parseDeclarations(extractBlockquoteStyle(result.html));
    expect(style["border-left"]).toBe("4px solid #2d5a4e");
    expect(style["background-color"]).toBe("#f3f0eb");
  });
});
