import { describe, expect, it } from "vitest";
import { parseMarkdown, serializeHast, transformToHast } from "../../packages/core/src/index.ts";

const plainMd = `# Heading One

This is **bold** and *italic* text.

- item one
- item two
- item three

[a link](https://example.com)

Another paragraph with more content.
`;

const gfmMd = `# GFM Sample

~~strikethrough~~ text.

| col A | col B |
|-------|-------|
| val 1 | val 2 |
| val 3 | val 4 |
`;

describe("pipeline-determinism: frozen singleton 产出 byte-identical（AC-005）", () => {
  it("parseMarkdown 对同一输入两次产出相同 AST JSON", () => {
    const result1 = JSON.stringify(parseMarkdown(plainMd));
    const result2 = JSON.stringify(parseMarkdown(plainMd));
    expect(result1).toBe(result2);
  });

  it("serializeHast(transformToHast(parseMarkdown(md))) 两次产出相同 HTML", () => {
    const html1 = serializeHast(transformToHast(parseMarkdown(plainMd)));
    const html2 = serializeHast(transformToHast(parseMarkdown(plainMd)));
    expect(html1).toBe(html2);
  });

  it("HTML 输出包含预期内容（标题/加粗/链接）", () => {
    const html = serializeHast(transformToHast(parseMarkdown(plainMd)));
    expect(html).toContain("<h1>");
    expect(html).toContain("<strong>");
    expect(html).toContain("<em>");
    expect(html).toContain('<a href="https://example.com">');
  });

  it("GFM 样本：parseMarkdown 两次产出相同 AST JSON", () => {
    const result1 = JSON.stringify(parseMarkdown(gfmMd));
    const result2 = JSON.stringify(parseMarkdown(gfmMd));
    expect(result1).toBe(result2);
  });

  it("GFM 样本：serializeHast(transformToHast(...)) 两次产出相同 HTML", () => {
    const html1 = serializeHast(transformToHast(parseMarkdown(gfmMd)));
    const html2 = serializeHast(transformToHast(parseMarkdown(gfmMd)));
    expect(html1).toBe(html2);
  });

  it("GFM 样本：HTML 包含 table 和 del 元素", () => {
    const html = serializeHast(transformToHast(parseMarkdown(gfmMd)));
    expect(html).toContain("<table>");
    expect(html).toContain("<del>");
  });
});
