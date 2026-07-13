import type { Element, Root } from "hast";
import { describe, expect, it } from "vitest";
import { applyRuleset } from "../../apply.ts";
import lintNowrapPercentWidth from "./lint-nowrap-percent-width.ts";

function hastWithStyle(style: string): Root {
  return {
    type: "root",
    children: [{ type: "element", tagName: "span", properties: { style }, children: [] }],
  };
}

function diagnosticsFor(style: string) {
  return applyRuleset(hastWithStyle(style), [lintNowrapPercentWidth], "output").diagnostics;
}

describe("lint-nowrap-percent-width: 致命组合诊断", () => {
  it("white-space:nowrap + width:1% 同节点组合报 warning", () => {
    const diags = diagnosticsFor("display:table-cell; white-space:nowrap; width:1%");
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe("lint-nowrap-percent-width");
    expect(diags[0]?.severity).toBe("warning");
  });

  it("width:50% 等任意百分比宽度与 nowrap 组合同样命中", () => {
    expect(diagnosticsFor("white-space:nowrap; width:50%")).toHaveLength(1);
  });

  it("单独 white-space:nowrap 不报", () => {
    expect(diagnosticsFor("white-space:nowrap")).toHaveLength(0);
  });

  it("单独百分比 width 不报", () => {
    expect(diagnosticsFor("width:1%")).toHaveLength(0);
  });

  it("nowrap + 显式 px 宽不报", () => {
    expect(diagnosticsFor("white-space:nowrap; width:44px")).toHaveLength(0);
  });

  it("HTML 输出不被改写（lint 不动产物）", () => {
    const result = applyRuleset(
      hastWithStyle("white-space:nowrap; width:1%"),
      [lintNowrapPercentWidth],
      "output"
    );
    const el = result.hast.children[0] as Element;
    expect(el.properties.style).toBe("white-space:nowrap; width:1%");
  });
});
