import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";

// Pipeline-semantic data attributes consumed downstream, in kebab canonical form.
// hast property keys carry two notations depending on construction path:
// camelCased by property-information when parsed from HTML (data-foo → dataFoo),
// kebab-cased literals when built programmatically — both are normalized before lookup.
const PRESERVE = new Set([
  "data-block",
  "data-variant",
  "data-block-slot",
  "data-block-slot-last",
  "data-steps-item",
  "data-dialog-avatar",
  "data-dialog-speaker",
  "data-quote-decoration",
  "data-paragraph-decoration",
  "data-pull-quote-author",
  "data-compare-left-label",
  "data-compare-left-value",
  "data-compare-right-label",
  "data-compare-right-value",
  "data-compare-title",
  "data-lh-exempt",
  "data-node-id",
]);

const isDataKey = (key: string): boolean => /^data(?:[A-Z0-9]|-)/.test(key);

const toKebab = (key: string): string =>
  key.startsWith("data-") ? key.toLowerCase() : key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const isStrippableData = (key: string): boolean => isDataKey(key) && !PRESERVE.has(toKebab(key));

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
