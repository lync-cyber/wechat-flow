import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { hasStyleProp, parseDeclarations, serializeDeclarations } from "./css-helpers.ts";

const MIN_PX = 14;
const MAX_PX = 32;

const clampFontSize: RuleDefinition = {
  id: "clamp-font-size",
  scope: "clamp",
  priority: 80,
  matcher: (node) => hasStyleProp(node, ["font-size"]),
  transform: (node: Node): Node => {
    const el = node as Element;
    const style = el.properties?.style as string;
    const decls = parseDeclarations(style);
    const updated = decls.map(([prop, val]): [string, string] => {
      if (prop !== "font-size") return [prop, val];
      const px = Number.parseFloat(val);
      if (Number.isNaN(px)) return [prop, val];
      const clamped = Math.min(MAX_PX, Math.max(MIN_PX, px));
      return [prop, `${clamped}px`];
    });
    return {
      ...el,
      properties: { ...el.properties, style: serializeDeclarations(updated) },
    } as unknown as Node;
  },
};

export default clampFontSize;
