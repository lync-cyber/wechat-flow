import type { Diagnostic } from "@wechat-flow/contracts";
import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { parseDeclarations } from "./css-helpers.ts";

function hasGridDisplay(node: Node): boolean {
  const el = node as Element;
  if (el.type !== "element") return false;
  const style = el.properties?.style;
  if (typeof style !== "string") return false;
  return parseDeclarations(style).some(
    ([prop, val]) => prop === "display" && val.trim() === "grid"
  );
}

const lintGridLayout: RuleDefinition = {
  id: "lint-grid-layout",
  scope: "lint",
  priority: 40,
  matcher: hasGridDisplay,
  transform: (node: Node): Node => node,
  diagnose: (node: Node): Diagnostic[] => {
    const el = node as Element;
    return [
      {
        severity: "error",
        ruleId: "lint-grid-layout",
        message: "display:grid is not supported in the WeChat article renderer",
        nodeRef: el.tagName,
      },
    ];
  },
};

export default lintGridLayout;
