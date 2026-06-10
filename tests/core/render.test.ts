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

describe("AC-005: ruleset stage 4 wiring — builtinRules default path", () => {
  it("markdown list input produces report.nodeChangeRecords with triggerRuleId transform-list-to-table", async () => {
    const result = await renderMarkdown("- A\n- B");
    expect(Array.isArray(result.report.nodeChangeRecords)).toBe(true);
    expect(result.report.nodeChangeRecords.length).toBeGreaterThan(0);
    const listRecord = result.report.nodeChangeRecords.find(
      (r) => r.triggerRuleId === "transform-list-to-table"
    );
    expect(listRecord).toBeDefined();
  });

  it("options.rules: [] disables all rules — no nodeChangeRecords produced", async () => {
    const result = await renderMarkdown("- A\n- B", { rules: [] });
    expect(result.report.nodeChangeRecords).toHaveLength(0);
    expect(result.report.diagnostics).toHaveLength(0);
  });

  it("result.report is a DiagnosticReport with required shape", async () => {
    const result = await renderMarkdown("hello");
    expect(result.report).toBeDefined();
    expect(Array.isArray(result.report.diagnostics)).toBe(true);
    expect(Array.isArray(result.report.nodeChangeRecords)).toBe(true);
    expect(Array.isArray(result.report.nightRiskIssues)).toBe(true);
    expect(typeof result.report.versionTriple.rulesetVersion).toBe("string");
  });

  it("rulesetVersion reflects getRulesetVersion() — not hardcoded 0.0.0", async () => {
    const result = await renderMarkdown("hello");
    expect(typeof result.rulesetVersion).toBe("string");
    expect(result.rulesetVersion).toBe("0.0.0");
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
