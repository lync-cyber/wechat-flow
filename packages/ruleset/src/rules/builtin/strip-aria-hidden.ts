import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";

const stripAriaHidden: RuleDefinition = {
  id: "strip-aria-hidden",
  scope: "strip",
  priority: 85,
  matcher: (node) => {
    if (node.type !== "element") return false;
    const el = node as Element;
    return "aria-hidden" in el.properties;
  },
  transform: (node: Node): Node => {
    const el = node as Element;
    const { "aria-hidden": _removed, ...rest } = el.properties;
    return { ...el, properties: rest } as unknown as Node;
  },
};

export default stripAriaHidden;
