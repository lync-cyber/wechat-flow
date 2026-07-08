import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";

// hast property keys are camelCased by property-information (data-foo → dataFoo, data-123 → data123);
// preserve wechat-flow pipeline-semantic data attributes used by downstream renderers.
const PRESERVE = new Set(["dataBlock", "dataVariant", "dataSlot"]);

const isStrippableData = (key: string): boolean => /^data[A-Z0-9]/.test(key) && !PRESERVE.has(key);

const stripDataAttr: RuleDefinition = {
  id: "strip-data-attr",
  scope: "strip",
  stage: "authoring",
  priority: 85,
  matcher: (node) => {
    if (node.type !== "element") return false;
    return Object.keys((node as Element).properties).some(isStrippableData);
  },
  transform: (node: Node): Node => {
    const el = node as Element;
    const cleaned = Object.fromEntries(
      Object.entries(el.properties).filter(([k]) => !isStrippableData(k))
    );
    return { ...el, properties: cleaned } as unknown as Node;
  },
  fixture: "rules/builtin/strip-data-attr",
};

export default stripDataAttr;
