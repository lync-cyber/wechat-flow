import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { parseDeclarations, serializeDeclarations } from "./css-helpers.ts";

const VW_RE = /(\d+\.?\d*)vw/g;

function styleHasVw(node: Node): boolean {
  if (node.type !== "element") return false;
  const el = node as Element;
  const style = el.properties?.style;
  if (typeof style !== "string") return false;
  return VW_RE.test(style);
}

const transformVwToPercent: RuleDefinition = {
  id: "transform-vw-to-percent",
  scope: "transform",
  priority: 70,
  matcher: styleHasVw,
  transform: (node: Node): Node => {
    const el = node as Element;
    const style = el.properties?.style as string;
    const decls = parseDeclarations(style);
    const updated = decls.map(([prop, val]): [string, string] => {
      const newVal = val.replace(/(\d+\.?\d*)vw/g, (_, n) => `${n}%`);
      return [prop, newVal];
    });
    return {
      ...el,
      properties: { ...el.properties, style: serializeDeclarations(updated) },
    } as unknown as Node;
  },
};

export default transformVwToPercent;
