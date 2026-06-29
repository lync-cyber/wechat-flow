import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";

// Preserve wechat-flow pipeline-semantic data attributes used by downstream renderers.
const PRESERVE = new Set(["data-block", "data-variant", "data-slot"]);

const stripDataAttr: RuleDefinition = {
  id: "strip-data-attr",
  scope: "strip",
  priority: 85,
  matcher: (node) => {
    if (node.type !== "element") return false;
    const el = node as Element;
    return Object.keys(el.properties).some((k) => k.startsWith("data-") && !PRESERVE.has(k));
  },
  transform: (node: Node): Node => {
    const el = node as Element;
    const cleaned = Object.fromEntries(
      Object.entries(el.properties).filter(([k]) => !k.startsWith("data-") || PRESERVE.has(k))
    );
    return { ...el, properties: cleaned } as unknown as Node;
  },
};

export default stripDataAttr;
