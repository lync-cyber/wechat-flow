import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { parseDeclarations, serializeDeclarations } from "./css-helpers.ts";

// Match numeric em values that are NOT preceded by 'r' (to exclude rem)
const EM_RE = /(?<![a-z])(\d+\.?\d*)em\b/g;

function styleHasEm(node: Node): boolean {
  if (node.type !== "element") return false;
  const el = node as Element;
  const style = el.properties?.style;
  if (typeof style !== "string") return false;
  return EM_RE.test(style);
}

const transformEmToPx: RuleDefinition = {
  id: "transform-em-to-px",
  scope: "transform",
  priority: 70,
  matcher: styleHasEm,
  transform: (node: Node): Node => {
    const el = node as Element;
    const style = el.properties?.style as string;
    const decls = parseDeclarations(style);
    const updated = decls.map(([prop, val]): [string, string] => {
      const newVal = val.replace(
        /(?<![a-z])(\d+\.?\d*)em\b/g,
        (_, n) => `${Number.parseFloat(n) * 16}px`
      );
      return [prop, newVal];
    });
    return {
      ...el,
      properties: { ...el.properties, style: serializeDeclarations(updated) },
    } as unknown as Node;
  },
};

export default transformEmToPx;
