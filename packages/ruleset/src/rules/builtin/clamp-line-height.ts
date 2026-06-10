import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { hasStyleProp, parseDeclarations, serializeDeclarations } from "./css-helpers.ts";

const MIN = 1.2;
const MAX = 2.5;

const clampLineHeight: RuleDefinition = {
  id: "clamp-line-height",
  scope: "clamp",
  priority: 80,
  matcher: (node) => hasStyleProp(node, ["line-height"]),
  transform: (node: Node): Node => {
    const el = node as Element;
    const style = el.properties?.style as string;
    const decls = parseDeclarations(style);
    const updated = decls.map(([prop, val]): [string, string] => {
      if (prop !== "line-height") return [prop, val];
      const num = Number.parseFloat(val);
      if (Number.isNaN(num)) return [prop, val];
      const clamped = Math.min(MAX, Math.max(MIN, num));
      return [prop, String(clamped)];
    });
    return {
      ...el,
      properties: { ...el.properties, style: serializeDeclarations(updated) },
    } as unknown as Node;
  },
};

export default clampLineHeight;
