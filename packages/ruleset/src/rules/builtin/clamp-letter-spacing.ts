import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { hasStyleProp, parseDeclarations, serializeDeclarations } from "./css-helpers.ts";

const MIN_EM = -0.05;
const MAX_EM = 0.2;

const clampLetterSpacing: RuleDefinition = {
  id: "clamp-letter-spacing",
  scope: "clamp",
  priority: 80,
  matcher: (node) => hasStyleProp(node, ["letter-spacing"]),
  transform: (node: Node): Node => {
    const el = node as Element;
    const style = el.properties?.style as string;
    const decls = parseDeclarations(style);
    const updated = decls.map(([prop, val]): [string, string] => {
      if (prop !== "letter-spacing") return [prop, val];
      if (!val.endsWith("em")) return [prop, val];
      const num = Number.parseFloat(val);
      if (Number.isNaN(num)) return [prop, val];
      const clamped = Math.min(MAX_EM, Math.max(MIN_EM, num));
      return [prop, `${clamped}em`];
    });
    return {
      ...el,
      properties: { ...el.properties, style: serializeDeclarations(updated) },
    } as unknown as Node;
  },
};

export default clampLetterSpacing;
