import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../packages/core/src/index.ts";

describe("AC-001: renderMarkdown basic heading and paragraph", () => {
  it("returns html containing h1 and p elements", async () => {
    const result = await renderMarkdown("# Hello\n\nWorld");
    expect(result.html).toMatch(/<h1[^>]*>/);
    expect(result.html).toMatch(/<p[^>]*>/);
  });

  it("returns empty diagnostics array", async () => {
    const result = await renderMarkdown("# Hello\n\nWorld");
    expect(Array.isArray(result.diagnostics)).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
  });
});

describe("AC-002: GFM table support", () => {
  it("returns html containing table element for GFM table syntax", async () => {
    const md = "| A | B |\n|---|---|\n| 1 | 2 |";
    const result = await renderMarkdown(md);
    expect(result.html).toMatch(/<table[^>]*>/);
  });
});

describe("AC-003: remark-directive container syntax", () => {
  it("does not throw and returns html for directive block syntax", async () => {
    const md = ":::card\ncontent\n:::";
    const result = await renderMarkdown(md);
    expect(typeof result.html).toBe("string");
    expect(result.html.length).toBeGreaterThan(0);
    expect(Array.isArray(result.diagnostics)).toBe(true);
  });
});

describe("AC-004: result contains coreVersion field", () => {
  it("coreVersion matches @wechat-flow/core package.json version", async () => {
    const result = await renderMarkdown("hello");
    expect(typeof result.coreVersion).toBe("string");
    expect(result.coreVersion).toBe("0.0.0");
  });
});

describe("AC-001 inline-style integration: renderMarkdown 产出 html 含 style 属性无 class", () => {
  it("h1 元素含 style= 属性且无 class= 属性", async () => {
    const result = await renderMarkdown("# 标题");
    expect(result.html).toMatch(/<h1[^>]+style="/);
    expect(result.html).not.toMatch(/<h1[^>]+class="/);
  });
});
