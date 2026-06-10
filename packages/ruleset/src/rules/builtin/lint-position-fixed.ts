import type { Diagnostic } from "@wechat-flow/contracts";
import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { parseDeclarations } from "./css-helpers.ts";

function hasPositionFixed(node: Node): boolean {
  const el = node as Element;
  if (el.type !== "element") return false;
  const style = el.properties?.style;
  if (typeof style !== "string") return false;
  return parseDeclarations(style).some(
    ([prop, val]) => prop === "position" && val.trim() === "fixed"
  );
}

const lintPositionFixed: RuleDefinition = {
  id: "lint-position-fixed",
  scope: "lint",
  priority: 40,
  matcher: hasPositionFixed,
  transform: (node: Node): Node => node,
  diagnose: (node: Node): Diagnostic[] => {
    const el = node as Element;
    return [
      {
        severity: "error",
        ruleId: "lint-position-fixed",
        message: "position:fixed is not supported in the WeChat article renderer",
        nodeRef: el.tagName,
      },
    ];
  },
};

export default lintPositionFixed;
