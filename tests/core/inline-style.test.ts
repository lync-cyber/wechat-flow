import { describe, expect, it } from "vitest";
import { filterCssAttrs } from "../../packages/core/src/pipeline/css-attr-filter.ts";
import { inlineStyle } from "../../packages/core/src/pipeline/inline-style.ts";
import { parseMarkdown } from "../../packages/core/src/pipeline/parse.ts";
import { serializeHast } from "../../packages/core/src/pipeline/serialize.ts";
import { transformToHast } from "../../packages/core/src/pipeline/transform.ts";

function renderWithInlineStyle(md: string): string {
  const mdast = parseMarkdown(md);
  const hast = transformToHast(mdast);
  const inlined = inlineStyle(hast);
  return serializeHast(inlined);
}

describe("AC-001: h1 含 style 属性且不含 class", () => {
  it("h1 元素含 style 属性（≥2 个 CSS 声明）且无 class 属性", () => {
    const html = renderWithInlineStyle("# 标题");
    expect(html).toMatch(/<h1[^>]+style="/);
    const styleMatch = html.match(/<h1[^>]+style="([^"]+)"/);
    expect(styleMatch).not.toBeNull();
    const styleValue = styleMatch?.[1];
    const declarations = styleValue?.split(";").filter((s) => s.trim().length > 0) ?? [];
    expect(declarations.length).toBeGreaterThanOrEqual(2);
    expect(html).not.toMatch(/<h1[^>]+class="/);
  });
});

describe("AC-002: 产出 HTML 无 <style>、无 CSS 变量、无 class 属性", () => {
  it("产出 HTML 不含 <style> 标签", () => {
    const html = renderWithInlineStyle("# 标题\n\n段落内容");
    expect(html).not.toMatch(/<style[\s>]/i);
  });

  it("产出 HTML 不含 CSS 变量 var(--", () => {
    const html = renderWithInlineStyle("# 标题\n\n段落内容");
    expect(html).not.toContain("var(--");
  });

  it("产出 HTML 不含 class 属性", () => {
    const html = renderWithInlineStyle("# 标题\n\n段落内容");
    expect(html).not.toMatch(/\bclass=/);
  });
});

describe("AC-003: juice inlineContent 产出可解析 CSS（无语法错误）", () => {
  it("juice 对给定 HTML + CSS 内联后 style 属性值可通过声明解析", () => {
    const juiceLib = require("juice") as {
      inlineContent: (html: string, css: string, opts?: Record<string, unknown>) => string;
    };
    const testHtml = "<h1>标题</h1><p>段落</p>";
    const testCss = "h1 { font-size: 22px; color: #333333; font-weight: bold; }";
    const result = juiceLib.inlineContent(testHtml, testCss, {
      removeStyleTags: true,
      preserveMediaQueries: false,
      applyWidthAttributes: false,
      applyAttributesTableElements: false,
    });
    expect(result).toMatch(/<h1[^>]+style="/);
    const styleMatch = result.match(/style="([^"]+)"/);
    expect(styleMatch).not.toBeNull();
    const styleValue = styleMatch?.[1];
    expect(styleValue).not.toContain("var(--");
    const declarations = styleValue?.split(";").filter((s) => s.trim().length > 0) ?? [];
    for (const decl of declarations) {
      expect(decl).toMatch(/^\s*[\w-]+\s*:/);
    }
  });
});

describe("AC-004: 链接 <a> 无 class 属性（stripClass 行为）", () => {
  it("含链接的 Markdown 产出 HTML 中 <a> 无 class= 属性", () => {
    const html = renderWithInlineStyle("[链接](https://example.com)");
    expect(html).toMatch(/<a[^>]+href=/);
    expect(html).not.toMatch(/<a[^>]+class="/);
  });
});

describe("css-attr-filter: 过滤恶意 CSS", () => {
  it("拒绝 expression(", () => {
    expect(filterCssAttrs("color: expression(alert(1))")).toBe("");
  });

  it("拒绝 url(javascript:", () => {
    expect(filterCssAttrs("background: url(javascript:alert(1))")).toBe("");
  });

  it("拒绝 behavior:", () => {
    expect(filterCssAttrs("behavior: url(xss.htc)")).toBe("");
  });

  it("拒绝 @import", () => {
    expect(filterCssAttrs("@import url('evil.css'); color: red")).toBe("");
  });

  it("允许合法 CSS 声明通过", () => {
    const input = "font-size: 16px; color: #333";
    expect(filterCssAttrs(input)).toBe(input);
  });

  it("允许合法 url() 引用通过", () => {
    const input = "background-image: url(https://example.com/img.png)";
    expect(filterCssAttrs(input)).toBe(input);
  });
});
