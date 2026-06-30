import type { Diagnostic } from "@wechat-flow/contracts";
import type { Element, Node } from "hast";
import { parseDeclarations } from "../builtin/css-helpers.ts";
import type { RuleDefinition } from "../registry.ts";

const MIN_LINE_HEIGHT = 1.4;

function getLineHeightValue(node: Node): number | null {
  const el = node as Element;
  if (el.type !== "element") return null;
  const style = el.properties?.style;
  if (typeof style !== "string") return null;
  for (const [prop, val] of parseDeclarations(style)) {
    if (prop === "line-height") {
      const num = Number.parseFloat(val);
      return Number.isNaN(num) ? null : num;
    }
  }
  return null;
}

const readabilityLineHeightMin: RuleDefinition = {
  id: "readability-line-height-min",
  scope: "lint",
  priority: 30,
  matcher: (node: Node): boolean => {
    const val = getLineHeightValue(node);
    return val !== null && val < MIN_LINE_HEIGHT;
  },
  transform: (node: Node): Node => node,
  diagnose: (node: Node): Diagnostic[] => {
    const val = getLineHeightValue(node);
    if (val === null) return [];
    return [
      {
        severity: "warning",
        ruleId: "readability-line-height-min",
        message: `line-height: ${val} < min ${MIN_LINE_HEIGHT}`,
      },
    ];
  },
};

export default readabilityLineHeightMin;
