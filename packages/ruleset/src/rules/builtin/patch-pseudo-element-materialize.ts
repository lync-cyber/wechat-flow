import type { Diagnostic } from "@wechat-flow/contracts";
import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";

const PSEUDO_PATTERN = /::(?:before|after)/;

function hasPseudoElementStyle(node: Node): boolean {
  const el = node as Element;
  if (el.type !== "element") return false;
  const style = el.properties?.style;
  if (typeof style !== "string") return false;
  return PSEUDO_PATTERN.test(style);
}

const patchPseudoElementMaterialize: RuleDefinition = {
  id: "patch-pseudo-element-materialize",
  scope: "lint",
  priority: 50,
  matcher: hasPseudoElementStyle,
  transform: (node: Node): Node => node,
  diagnose: (node: Node): Diagnostic[] => {
    const el = node as Element;
    return [
      {
        severity: "warning",
        ruleId: "patch-pseudo-element-materialize",
        message:
          "Element uses ::before/::after pseudo-elements which are stripped by the WeChat paste filter",
        nodeRef: el.tagName,
      },
    ];
  },
};

export default patchPseudoElementMaterialize;
