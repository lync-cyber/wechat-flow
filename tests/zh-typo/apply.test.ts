import { describe, expect, it } from "vitest";
import { applyZhTypo } from "../../packages/zh-typo/src/index.ts";

describe("applyZhTypo", () => {
  it("AC-001: inserts spaces between Chinese and English (zh-en-space)", () => {
    const result = applyZhTypo({ markdown: "这是GitHub的项目" });
    expect(result.fixed).toBe("这是 GitHub 的项目");
    expect(result.perRule["zh-en-space"]).toBe(2);
    expect(result.totalChanges).toBe(2);
  });

  it("AC-002: skips content inside fenced code blocks", () => {
    const markdown = "前言\n\n```\ncall GitHub()\n```\n\n结尾";
    const result = applyZhTypo({ markdown });
    expect(result.fixed).toContain("call GitHub()");
    const codeMatch = result.fixed.match(/```[\s\S]*?```/);
    expect(codeMatch).not.toBeNull();
    expect(codeMatch?.[0]).toContain("call GitHub()");
  });

  it("AC-003: converts ASCII double quotes to smart curly quotes", () => {
    const result = applyZhTypo({ markdown: '这是"引用"内容' });
    expect(result.fixed).toBe("这是“引用”内容");
    expect(result.perRule["smart-quotes"]).toBeGreaterThanOrEqual(1);
    expect(result.totalChanges).toBeGreaterThanOrEqual(1);
  });

  it("AC-004: converts three ASCII dots to Chinese ellipsis", () => {
    const result = applyZhTypo({ markdown: "结尾..." });
    expect(result.fixed).toBe("结尾……");
    expect(result.perRule["ellipsis-dash"]).toBeGreaterThanOrEqual(1);
    expect(result.totalChanges).toBeGreaterThanOrEqual(1);
  });

  it("skips inlineCode content", () => {
    const result = applyZhTypo({ markdown: "前言 `GitHub` 后语" });
    expect(result.fixed).toContain("`GitHub`");
  });

  it("R-001: double-dash converts to em-dash pair counted in ellipsis-dash, not fullwidth-punctuation", () => {
    const result = applyZhTypo({ markdown: "前言--后语" });
    expect(result.fixed).toBe("前言——后语");
    expect(result.perRule["ellipsis-dash"]).toBeGreaterThanOrEqual(1);
    expect(result.perRule["fullwidth-punctuation"]).toBe(0);
  });

  it("R-002: rules filter — only zh-en-space fires when rules=['zh-en-space']", () => {
    const input = '这是GitHub的"项目"';
    const filtered = applyZhTypo({ markdown: input, rules: ["zh-en-space"] });
    expect(filtered.perRule["zh-en-space"]).toBeGreaterThanOrEqual(1);
    expect(filtered.perRule["smart-quotes"]).toBeUndefined();
    expect(filtered.perRule["fullwidth-punctuation"]).toBeUndefined();
    expect(filtered.perRule["ellipsis-dash"]).toBeUndefined();
    expect(filtered.fixed).toContain(" GitHub ");
    expect(filtered.fixed).not.toContain("“");
  });

  it("R-006: converts paired ASCII single quotes to curly single quotes", () => {
    const result = applyZhTypo({ markdown: "这是'引用'内容" });
    expect(result.fixed).toBe("这是‘引用’内容");
    expect(result.perRule["smart-quotes"]).toBeGreaterThanOrEqual(1);
  });
});
