import { describe, expect, it } from "vitest";
import keywordList from "../../packages/ruleset/src/keyword-list.json" with { type: "json" };
import { keywordListVersion, lintMarkdown } from "../../packages/ruleset/src/lints/keyword-lint.ts";

// ── AC-001: lintMarkdown returns Diagnostic[] with correct fields ─────────────

describe("AC-001: lintMarkdown 检测预设关键词，返回含字段的 Diagnostic[]", () => {
  it("空字符串返回 []", () => {
    const result = lintMarkdown("");
    expect(result).toEqual([]);
  });

  it("无命中文本返回 []", () => {
    const result = lintMarkdown("这是一段普通的微信公众号文章内容，没有违规词汇。");
    expect(result).toEqual([]);
  });

  it("含「最佳」命中后返回 severity=warning、ruleId=keyword-lint、matchedKeyword=最佳", () => {
    const result = lintMarkdown("这是最佳方案");
    expect(result.length).toBeGreaterThanOrEqual(1);
    const hit = result.find((d) => d.matchedKeyword === "最佳");
    expect(hit).toBeDefined();
    expect(hit?.severity).toBe("warning");
    expect(hit?.ruleId).toBe("keyword-lint");
    expect(hit?.matchedKeyword).toBe("最佳");
  });

  it("location.line / column 指向正确位置（单行第一词）", () => {
    const result = lintMarkdown("最佳方案");
    const hit = result.find((d) => d.matchedKeyword === "最佳");
    expect(hit).toBeDefined();
    expect(hit?.location).toEqual({ line: 1, column: 1 });
  });

  it("location.line 在多行文本中指向正确行号", () => {
    const content = "第一行普通内容\n第二行含唯一关键词\n第三行普通内容";
    const result = lintMarkdown(content);
    const hit = result.find((d) => d.matchedKeyword === "唯一");
    expect(hit).toBeDefined();
    expect(hit?.location?.line).toBe(2);
  });

  it("location.column 在行内指向正确列号（1-based）", () => {
    const content = "前缀文本最佳方案";
    const result = lintMarkdown(content);
    const hit = result.find((d) => d.matchedKeyword === "最佳");
    expect(hit).toBeDefined();
    expect(hit?.location?.column).toBe(5);
  });

  it("同一词多次出现在同一行返回多项", () => {
    const content = "最佳选择最佳方案";
    const result = lintMarkdown(content).filter((d) => d.matchedKeyword === "最佳");
    expect(result.length).toBe(2);
    expect(result[0].location?.column).toBe(1);
    expect(result[1].location?.column).toBe(5);
  });

  it("多行各含一词返回各自条目", () => {
    const content = "第一名\n顶级产品\n国家级项目";
    const result = lintMarkdown(content);
    expect(result.some((d) => d.matchedKeyword === "第一")).toBe(true);
    expect(result.some((d) => d.matchedKeyword === "顶级")).toBe(true);
    expect(result.some((d) => d.matchedKeyword === "国家级")).toBe(true);
  });

  it("每个 Diagnostic 含 message 字段（非空字符串）", () => {
    const result = lintMarkdown("最佳方案");
    expect(result[0].message).toBeTruthy();
  });
});

// ── AC-002: 词库版本与热更新 ──────────────────────────────────────────────────

describe("AC-002: keyword-list.json 版本与热更新", () => {
  it("keyword-list.json version 为非空 semver 字符串", () => {
    expect(keywordList.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(keywordList.version.length).toBeGreaterThan(0);
  });

  it("keywordListVersion 等于 keyword-list.json 的 version 字段", () => {
    expect(keywordListVersion).toBe(keywordList.version);
  });

  it("默认词库 keywords 非空（≥ 12 词）", () => {
    expect(keywordList.keywords.length).toBeGreaterThanOrEqual(12);
  });

  it("注入自定义词库——含「自造词」时命中，默认极限词不命中（热替换生效）", () => {
    const content = "这是自造词的测试，没有最佳国家级等极限词";
    const result = lintMarkdown(content, { keywords: ["自造词"] });
    expect(result.some((d) => d.matchedKeyword === "自造词")).toBe(true);
    expect(result.some((d) => d.matchedKeyword === "最佳")).toBe(false);
    expect(result.some((d) => d.matchedKeyword === "国家级")).toBe(false);
  });

  it("注入空数组自定义词库——任何文本均无命中", () => {
    const content = "最佳第一国家级顶级";
    const result = lintMarkdown(content, { keywords: [] });
    expect(result).toEqual([]);
  });
});
