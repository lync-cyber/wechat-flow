import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";

// hast property keys are camelCased by property-information (aria-hidden → ariaHidden).
const stripAriaHidden: RuleDefinition = {
  id: "strip-aria-hidden",
  scope: "strip",
  stage: "authoring",
  priority: 85,
  matcher: (node) => {
    if (node.type !== "element") return false;
    return "ariaHidden" in (node as Element).properties;
  },
  transform: (node: Node): Node => {
    const el = node as Element;
    const { ariaHidden: _removed, ...rest } = el.properties;
    return { ...el, properties: rest } as unknown as Node;
  },
  fixture: "rules/builtin/strip-aria-hidden",
};

export default stripAriaHidden;
