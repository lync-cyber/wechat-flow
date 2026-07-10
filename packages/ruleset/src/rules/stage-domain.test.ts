import { describe, expect, it } from "vitest";
import { builtinRules } from "./builtin/index.ts";

// T-183 AC-001: 归域迁移正确性（arch 附录 A 权威 SSOT）。

const OUTPUT_DOMAIN_RULE_IDS = [
  // strip
  "strip-css-var",
  "strip-calc-expression",
  "strip-flex-gap",
  "strip-font-family",
  "strip-negative-margin",
  "strip-position",
  "strip-pseudo-classes",
  "strip-transform-origin",
  // clamp
  "clamp-font-size",
  "clamp-line-height",
  "clamp-letter-spacing",
  "clamp-word-spacing",
  "clamp-text-indent",
  "clamp-padding",
  "clamp-margin-top-bottom",
  "clamp-border-radius",
  "clamp-image-width",
  "clamp-image-max-width",
  "clamp-rgba-alpha",
  // transform
  "transform-em-to-px",
  "transform-rem-to-px",
  "transform-vw-to-percent",
  "transform-vh-fallback",
  "transform-hsl-to-rgb",
  "transform-uppercase-hex-lower",
  "transform-svg-white-offset",
  "transform-svg-url-normalize",
  "transform-data-uri-unquote",
  "transform-ul-marker-type",
  // patch
  "patch-flex-to-block",
  "patch-pseudo-element-materialize",
  // lint
  "lint-filter-backdrop",
  "lint-grid-layout",
  "lint-position-fixed",
  "readability-font-size-min",
  "readability-line-height-min",
  "readability-paragraph-length",
];

const AUTHORING_DOMAIN_RULE_IDS = [
  "strip-script",
  "strip-style-tag",
  "strip-js-events",
  "strip-id-attr",
  "strip-data-attr",
  "strip-aria-hidden",
  // 结构改写靶向作者输入 <ul>（非样式合成产物），且 ul→table 须前置于表格样式 pass 方能被样式化，故归 authoring。
  "transform-list-to-table",
];

function findRule(id: string): { id: string; stage: string } {
  const rule = builtinRules.find((r) => r.id === id);
  if (!rule) throw new Error(`builtinRules missing rule id="${id}"`);
  return rule;
}

describe("T-183 AC-001: ruleset stage domain migration (arch 附录 A)", () => {
  it("OUTPUT_DOMAIN_RULE_IDS 覆盖 arch 附录 A.2 output 域 37 条规则", () => {
    expect(new Set(OUTPUT_DOMAIN_RULE_IDS).size).toBe(37);
    expect(OUTPUT_DOMAIN_RULE_IDS).toHaveLength(37);
  });

  it('全部 37 条 output 域规则 stage==="output"', () => {
    for (const id of OUTPUT_DOMAIN_RULE_IDS) {
      expect.soft(findRule(id).stage, `${id}.stage`).toBe("output");
    }
  });

  it('authoring 域规则（6 条 A.1 + transform-list-to-table）保持 stage==="authoring"', () => {
    for (const id of AUTHORING_DOMAIN_RULE_IDS) {
      expect.soft(findRule(id).stage, `${id}.stage`).toBe("authoring");
    }
  });
});
