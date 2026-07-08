import type { Element, Root } from "hast";
import { describe, expect, it } from "vitest";
import { applyRuleset } from "../apply.ts";
import { builtinRules } from "./builtin/index.ts";
import readabilityFontSizeMin from "./readability/readability-font-size-min.ts";
import type { RuleDefinition } from "./registry.ts";

// T-183 AC-003 (rule-level clamp/threshold) + AC-004 (output-stage negative probes).

async function parseFragment(html: string): Promise<Root> {
  const { fromHtml } = await import("hast-util-from-html");
  return fromHtml(html, { fragment: true }) as unknown as Root;
}

async function applyStage(html: string, stage: "authoring" | "output"): Promise<string> {
  const { toHtml } = await import("hast-util-to-html");
  const hast = await parseFragment(html);
  const result = applyRuleset(hast, builtinRules as RuleDefinition[], stage);
  return toHtml(result.hast);
}

describe("T-183 AC-003: readability-font-size-min 阈值对齐决策②-i = 14px", () => {
  it("13px 字号命中 matcher 并产出一条 warning 诊断（阈值 12→14）", async () => {
    const hast = await parseFragment('<p style="font-size:13px">正文</p>');
    const el = hast.children[0] as Element;

    expect(readabilityFontSizeMin.matcher(el)).toBe(true);
    const diagnostics = readabilityFontSizeMin.diagnose ? readabilityFontSizeMin.diagnose(el) : [];
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.ruleId).toBe("readability-font-size-min");
    expect(diagnostics[0]?.severity).toBe("warning");
    expect(diagnostics[0]?.message).toContain("13px");
    expect(diagnostics[0]?.message).toContain("14px");
  });
});

describe("T-183 AC-003: clamp-line-height output 相仍夹正文行 line-height 至 [1.2,2.5]", () => {
  it('普通 <p style="line-height:1"> 经 output 相后 line-height 夹至 1.2', async () => {
    const html = await applyStage('<p style="line-height:1">正文</p>', "output");
    expect(html).toMatch(/line-height:\s*1\.2(;|"|$)/);
  });
});

describe("T-183 AC-004.1: strip-font-family（决策①剥除）迁 output 后仅 output 相拦截", () => {
  it("output 相拦截生成 font-family 声明，authoring 相不再拦截（规则已迁 output）", async () => {
    const outputHtml = await applyStage('<p style="font-family:Arial">正文</p>', "output");
    expect(outputHtml).not.toMatch(/font-family\s*:/i);

    const authoringHtml = await applyStage('<p style="font-family:Arial">正文</p>', "authoring");
    expect(authoringHtml).toMatch(/font-family:\s*Arial/i);
  });
});

describe("T-183 AC-004.2: strip-position 迁 output 后仅 output 相拦截", () => {
  it("output 相拦截生成 position 声明，authoring 相不再拦截（规则已迁 output）", async () => {
    const outputHtml = await applyStage('<div style="position:relative">正文</div>', "output");
    expect(outputHtml).not.toMatch(/position\s*:/i);

    const authoringHtml = await applyStage(
      '<div style="position:relative">正文</div>',
      "authoring"
    );
    expect(authoringHtml).toMatch(/position:\s*relative/i);
  });
});

describe("T-183 AC-004.3: clamp-font-size 迁 output 后仅 output 相拦截（决策②-i 阈值 14）", () => {
  it("output 相把 font-size:13px 夹至 ≥14px，authoring 相不再拦截（原样保留 13px）", async () => {
    const outputHtml = await applyStage('<p style="font-size:13px">正文</p>', "output");
    const outputMatch = outputHtml.match(/font-size:\s*([\d.]+)px/);
    expect(outputMatch).not.toBeNull();
    expect(Number(outputMatch?.[1])).toBeGreaterThanOrEqual(14);

    const authoringHtml = await applyStage('<p style="font-size:13px">正文</p>', "authoring");
    expect(authoringHtml).toMatch(/font-size:\s*13px/);
  });
});

describe("T-183 AC-004.4: clamp-rgba-alpha 迁 output 后仅 output 相拦截（决策②-ii 阈值 0.15）", () => {
  it("output 相把 alpha 0.06 夹至 ≥0.15，authoring 相不再拦截（原样保留 0.06）", async () => {
    const outputHtml = await applyStage(
      '<p style="background:rgba(0,0,0,0.06)">正文</p>',
      "output"
    );
    const outputMatch = outputHtml.match(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*([\d.]+)\s*\)/);
    expect(outputMatch).not.toBeNull();
    expect(Number(outputMatch?.[1])).toBeGreaterThanOrEqual(0.15);

    const authoringHtml = await applyStage(
      '<p style="background:rgba(0,0,0,0.06)">正文</p>',
      "authoring"
    );
    expect(authoringHtml).toMatch(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.06\s*\)/);
  });
});

describe("T-183 AC-004.5: transform-em-to-px 迁 output 后仅 output 相拦截", () => {
  it("output 相把 font-size:2.2em 换算为 35.2px，authoring 相不再拦截（原样保留 2.2em）", async () => {
    const outputHtml = await applyStage('<p style="font-size:2.2em">正文</p>', "output");
    expect(outputHtml).toMatch(/font-size:\s*35\.2px/);
    expect(outputHtml).not.toMatch(/em\b/);

    const authoringHtml = await applyStage('<p style="font-size:2.2em">正文</p>', "authoring");
    expect(authoringHtml).toMatch(/font-size:\s*2\.2em/);
  });
});

describe("T-183 AC-004.6: transform-svg-white-offset 迁 output 后仅 output 相拦截（决策②-附）", () => {
  it("output 相把 svg 内 #ffffff 替换为 #fefefe（非 svg 上下文不受影响），authoring 相不再拦截", async () => {
    const outputHtml = await applyStage(
      '<svg fill="#ffffff"><rect fill="#ffffff"></rect></svg>',
      "output"
    );
    expect(outputHtml).not.toMatch(/#ffffff/i);
    expect(outputHtml).toMatch(/#fefefe/i);

    const nonSvgOutputHtml = await applyStage('<div fill="#ffffff">plain</div>', "output");
    expect(nonSvgOutputHtml).toMatch(/#ffffff/i);

    const authoringHtml = await applyStage(
      '<svg fill="#ffffff"><rect fill="#ffffff"></rect></svg>',
      "authoring"
    );
    expect(authoringHtml).toMatch(/#ffffff/i);
  });
});
