import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { parseDeclarations, serializeDeclarations } from "./css-helpers.ts";

const REM_RE = /(\d+\.?\d*)rem/g;

function styleHasRem(node: Node): boolean {
  if (node.type !== "element") return false;
  const el = node as Element;
  const style = el.properties?.style;
  if (typeof style !== "string") return false;
  return REM_RE.test(style);
}

const transformRemToPx: RuleDefinition = {
  id: "transform-rem-to-px",
  scope: "transform",
  priority: 70,
  matcher: styleHasRem,
  transform: (node: Node): Node => {
    const el = node as Element;
    const style = el.properties?.style as string;
    const decls = parseDeclarations(style);
    const updated = decls.map(([prop, val]): [string, string] => {
      const newVal = val.replace(/(\d+\.?\d*)rem/g, (_, n) => `${Number.parseFloat(n) * 16}px`);
      return [prop, newVal];
    });
    return {
      ...el,
      properties: { ...el.properties, style: serializeDeclarations(updated) },
    } as unknown as Node;
  },
};

export default transformRemToPx;
