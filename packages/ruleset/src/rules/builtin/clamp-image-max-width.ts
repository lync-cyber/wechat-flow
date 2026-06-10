import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { hasStyleProp, parseDeclarations, serializeDeclarations } from "./css-helpers.ts";

function matchesImgWithMaxWidthOver100Pct(node: Node): boolean {
  const el = node as Element;
  if (el.type !== "element" || el.tagName !== "img") return false;
  if (!hasStyleProp(node, ["max-width"])) return false;
  const style = el.properties?.style as string;
  const decls = parseDeclarations(style);
  return decls.some(([prop, val]) => {
    if (prop !== "max-width") return false;
    const pct = Number.parseFloat(val);
    return val.endsWith("%") && !Number.isNaN(pct) && pct > 100;
  });
}

const clampImageMaxWidth: RuleDefinition = {
  id: "clamp-image-max-width",
  scope: "clamp",
  priority: 70,
  matcher: matchesImgWithMaxWidthOver100Pct,
  transform: (node: Node): Node => {
    const el = node as Element;
    const style = el.properties?.style as string;
    const decls = parseDeclarations(style);
    const updated = decls.map(([prop, val]): [string, string] => {
      if (prop !== "max-width") return [prop, val];
      const pct = Number.parseFloat(val);
      if (val.endsWith("%") && !Number.isNaN(pct) && pct > 100) return [prop, "100%"];
      return [prop, val];
    });
    return {
      ...el,
      properties: { ...el.properties, style: serializeDeclarations(updated) },
    } as unknown as Node;
  },
};

export default clampImageMaxWidth;
