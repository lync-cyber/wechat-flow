import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { parseDeclarations, serializeDeclarations } from "./css-helpers.ts";

function hasCalc(node: Node): boolean {
  if (node.type !== "element") return false;
  const el = node as Element;
  const style = el.properties?.style;
  if (typeof style !== "string") return false;
  return parseDeclarations(style).some(([, val]) => val.includes("calc("));
}

const stripCalcExpression: RuleDefinition = {
  id: "strip-calc-expression",
  scope: "strip",
  priority: 85,
  matcher: hasCalc,
  transform: (node: Node): Node => {
    const el = node as Element;
    const style = el.properties?.style as string;
    const decls = parseDeclarations(style);
    const kept = decls.filter(([, val]) => !val.includes("calc("));
    return {
      ...el,
      properties: { ...el.properties, style: serializeDeclarations(kept) },
    } as unknown as Node;
  },
};

export default stripCalcExpression;
