import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { parseDeclarations, serializeDeclarations } from "./css-helpers.ts";

const VH_RE = /\d+\.?\d*vh/;

function styleHasVh(node: Node): boolean {
  if (node.type !== "element") return false;
  const el = node as Element;
  const style = el.properties?.style;
  if (typeof style !== "string") return false;
  return VH_RE.test(style);
}

const transformVhFallback: RuleDefinition = {
  id: "transform-vh-fallback",
  scope: "transform",
  priority: 70,
  matcher: styleHasVh,
  transform: (node: Node): Node => {
    const el = node as Element;
    const style = el.properties?.style as string;
    const decls = parseDeclarations(style);
    const updated = decls.map(([prop, val]): [string, string] => {
      if (!/\d+\.?\d*vh/.test(val)) return [prop, val];
      return [prop, "auto"];
    });
    return {
      ...el,
      properties: { ...el.properties, style: serializeDeclarations(updated) },
    } as unknown as Node;
  },
};

export default transformVhFallback;
