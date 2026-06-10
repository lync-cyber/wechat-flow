import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { hasStyleProp, parseDeclarations, serializeDeclarations } from "./css-helpers.ts";

const MAX_PX = 677;

function matchesImgWithWidthOver(node: Node): boolean {
  const el = node as Element;
  if (el.type !== "element" || el.tagName !== "img") return false;
  if (!hasStyleProp(node, ["width"])) return false;
  const style = el.properties?.style as string;
  const decls = parseDeclarations(style);
  return decls.some(([prop, val]) => {
    if (prop !== "width") return false;
    const px = Number.parseFloat(val);
    return !Number.isNaN(px) && px > MAX_PX;
  });
}

const clampImageWidth: RuleDefinition = {
  id: "clamp-image-width",
  scope: "clamp",
  priority: 70,
  matcher: matchesImgWithWidthOver,
  transform: (node: Node): Node => {
    const el = node as Element;
    const style = el.properties?.style as string;
    const decls = parseDeclarations(style);
    const updated = decls.map(([prop, val]): [string, string] => {
      if (prop !== "width") return [prop, val];
      const px = Number.parseFloat(val);
      if (Number.isNaN(px)) return [prop, val];
      return [prop, `${Math.min(MAX_PX, px)}px`];
    });
    return {
      ...el,
      properties: { ...el.properties, style: serializeDeclarations(updated) },
    } as unknown as Node;
  },
};

export default clampImageWidth;
