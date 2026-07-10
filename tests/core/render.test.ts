import type { ThemeDefinition } from "@wechat-flow/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { renderMarkdown } from "../../packages/core/src/index.ts";
import { registerTheme, resetThemeRegistry } from "../../packages/core/src/registry/theme.ts";
import { wcagContrast } from "../../packages/palette/src/index.ts";

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
    expect(result.coreVersion).toBe("0.1.0");
  });
});

describe("AC-001 inline-style integration: renderMarkdown 产出 html 含 style 属性无 class", () => {
  it("h1 元素含 style= 属性且无 class= 属性", async () => {
    const result = await renderMarkdown("# 标题");
    expect(result.html).toMatch(/<h1[^>]+style="/);
    expect(result.html).not.toMatch(/<h1[^>]+class="/);
  });
});

describe("AC-002 集成: 默认色渲染无夜间风险问题", () => {
  it("result.report.nightRiskIssues 为空数组（默认配色对比度合规）", async () => {
    const result = await renderMarkdown("# 标题\n\n正文");
    expect(result.report.nightRiskIssues).toEqual([]);
  });
});

describe("AC-003 集成: paint 覆盖产生低对比前景后被 nightRiskIssues 捕获", () => {
  const LOW_CONTRAST_COLOR = "#EEEEEE";
  const BRAND_TOKEN = "--color-brand";

  const lowContrastTheme: ThemeDefinition = {
    id: "night-risk-test",
    name: "Night Risk Test",
    tokens: { [BRAND_TOKEN]: "#333333" },
    blocks: {
      p: { default: { color: "#333333", "font-size": "15px" } },
    },
    paintable: [BRAND_TOKEN],
    assets: {},
    meta: { author: "t", version: "1.0.0", wcagContrast: { checked: true, minRatio: 4.5 } },
  };

  beforeEach(() => {
    resetThemeRegistry();
    registerTheme(lowContrastTheme);
  });

  it("paint 覆盖 p 前景色为浅灰后，report.nightRiskIssues 非空且含该节点", async () => {
    // sanity: 覆盖色确实低于 WCAG AA（默认白色背景）
    expect(wcagContrast(LOW_CONTRAST_COLOR, "#FFFFFF")).toBeLessThan(4.5);

    const md = `---\ntheme: night-risk-test\npaint:\n  '${BRAND_TOKEN}': '${LOW_CONTRAST_COLOR}'\n---\nHello world`;
    const result = await renderMarkdown(md);

    expect(result.report.nightRiskIssues.length).toBeGreaterThanOrEqual(1);
    const entry = result.report.nightRiskIssues[0];
    expect(entry.contrastRatio).toBeLessThan(4.5);
    expect(entry.foreground.toLowerCase()).toBe(LOW_CONTRAST_COLOR.toLowerCase());
    expect(entry.nodeSelector).toMatch(/p/);
  });
});
