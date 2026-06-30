import type { Diagnostic } from "@wechat-flow/contracts";
import type { Element, Node } from "hast";
import { parseDeclarations } from "../builtin/css-helpers.ts";
import type { RuleDefinition } from "../registry.ts";

const MIN_FONT_SIZE_PX = 12;

function getPxFontSize(node: Node): number | null {
  const el = node as Element;
  if (el.type !== "element") return null;
  const style = el.properties?.style;
  if (typeof style !== "string") return null;
  for (const [prop, val] of parseDeclarations(style)) {
    if (prop === "font-size") {
      if (!val.endsWith("px")) return null;
      const px = Number.parseFloat(val);
      return Number.isNaN(px) ? null : px;
    }
  }
  return null;
}

const readabilityFontSizeMin: RuleDefinition = {
  id: "readability-font-size-min",
  scope: "lint",
  priority: 30,
  matcher: (node: Node): boolean => {
    const px = getPxFontSize(node);
    return px !== null && px < MIN_FONT_SIZE_PX;
  },
  transform: (node: Node): Node => node,
  diagnose: (node: Node): Diagnostic[] => {
    const px = getPxFontSize(node);
    if (px === null) return [];
    return [
      {
        severity: "warning",
        ruleId: "readability-font-size-min",
        message: `font-size: ${px}px < min ${MIN_FONT_SIZE_PX}px`,
      },
    ];
  },
};

export default readabilityFontSizeMin;
