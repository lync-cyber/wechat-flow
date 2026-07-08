import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";

const stripIdAttr: RuleDefinition = {
  id: "strip-id-attr",
  scope: "strip",
  stage: "authoring",
  priority: 90,
  matcher: (node) => node.type === "element" && "id" in (node as Element).properties,
  transform: (node) => {
    const el = node as Element;
    const { id: _id, ...rest } = el.properties;
    return { ...el, properties: rest } as Node;
  },
  fixture: "rules/builtin/strip-id-attr",
};

export default stripIdAttr;
