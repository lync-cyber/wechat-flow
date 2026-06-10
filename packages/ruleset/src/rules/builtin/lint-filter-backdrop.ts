import type { Diagnostic } from "@wechat-flow/contracts";
import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { hasStyleProp } from "./css-helpers.ts";

const lintFilterBackdrop: RuleDefinition = {
  id: "lint-filter-backdrop",
  scope: "lint",
  priority: 40,
  matcher: (node: Node) => hasStyleProp(node, ["backdrop-filter"]),
  transform: (node: Node): Node => node,
  diagnose: (node: Node): Diagnostic[] => {
    const el = node as Element;
    return [
      {
        severity: "error",
        ruleId: "lint-filter-backdrop",
        message: "backdrop-filter is not supported in the WeChat article renderer",
        nodeRef: el.tagName,
      },
    ];
  },
};

export default lintFilterBackdrop;
