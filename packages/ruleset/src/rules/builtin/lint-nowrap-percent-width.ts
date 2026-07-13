import type { Diagnostic } from "@wechat-flow/contracts";
import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { parseDeclarations } from "./css-helpers.ts";

// white-space:nowrap + 百分比 width 是合法单属性、致命组合：微信粘贴后
// shrink-to-fit 单元格塌陷（nowrap 撑宽失效），预览与粘贴后视觉分叉。
function hasNowrapPercentWidth(node: Node): boolean {
  const el = node as Element;
  if (el.type !== "element") return false;
  const style = el.properties?.style;
  if (typeof style !== "string") return false;
  const decls = parseDeclarations(style);
  const hasNowrap = decls.some(([prop, val]) => prop === "white-space" && val.trim() === "nowrap");
  const hasPercentWidth = decls.some(
    ([prop, val]) => prop === "width" && /^[\d.]+%$/.test(val.trim())
  );
  return hasNowrap && hasPercentWidth;
}

const lintNowrapPercentWidth: RuleDefinition = {
  id: "lint-nowrap-percent-width",
  scope: "lint",
  stage: "output",
  priority: 40,
  matcher: hasNowrapPercentWidth,
  transform: (node: Node): Node => node,
  diagnose: (node: Node): Diagnostic[] => {
    const el = node as Element;
    return [
      {
        severity: "warning",
        ruleId: "lint-nowrap-percent-width",
        message:
          "white-space:nowrap 与百分比 width 组合在微信粘贴后会塌陷（shrink-to-fit 失效），请改用显式 px 宽度",
        nodeRef: el.tagName,
      },
    ];
  },
  fixture: "rules/builtin/lint-nowrap-percent-width",
};

export default lintNowrapPercentWidth;
