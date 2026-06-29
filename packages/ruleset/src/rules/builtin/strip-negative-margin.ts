import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { parseDeclarations, serializeDeclarations } from "./css-helpers.ts";

const MARGIN_PROPS = new Set([
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
]);

function hasNegativeMargin(node: Node): boolean {
  if (node.type !== "element") return false;
  const el = node as Element;
  const style = el.properties?.style;
  if (typeof style !== "string") return false;
  return parseDeclarations(style).some(
    ([prop, val]) => MARGIN_PROPS.has(prop) && val.trimStart().startsWith("-")
  );
}

const stripNegativeMargin: RuleDefinition = {
  id: "strip-negative-margin",
  scope: "strip",
  priority: 85,
  matcher: hasNegativeMargin,
  transform: (node: Node): Node => {
    const el = node as Element;
    const style = el.properties?.style as string;
    const decls = parseDeclarations(style);
    const kept = decls.filter(
      ([prop, val]) => !(MARGIN_PROPS.has(prop) && val.trimStart().startsWith("-"))
    );
    return {
      ...el,
      properties: { ...el.properties, style: serializeDeclarations(kept) },
    } as unknown as Node;
  },
};

export default stripNegativeMargin;
