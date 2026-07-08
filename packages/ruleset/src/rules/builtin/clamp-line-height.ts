import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { hasStyleProp, parseDeclarations, serializeDeclarations } from "./css-helpers.ts";

const MIN = 1.2;
const MAX = 2.5;

export const LINE_HEIGHT_EXEMPT_ATTR = "data-lh-exempt";

function isExempt(el: Element): boolean {
  return el.properties?.[LINE_HEIGHT_EXEMPT_ATTR] === "true";
}

function stripExemptMarker(properties: Element["properties"]): Element["properties"] {
  const { [LINE_HEIGHT_EXEMPT_ATTR]: _marker, ...rest } = properties ?? {};
  return rest;
}

const clampLineHeight: RuleDefinition = {
  id: "clamp-line-height",
  scope: "clamp",
  stage: "output",
  priority: 80,
  matcher: (node) =>
    hasStyleProp(node, ["line-height"]) ||
    (node as Element).properties?.[LINE_HEIGHT_EXEMPT_ATTR] !== undefined,
  transform: (node: Node): Node => {
    const el = node as Element;
    if (isExempt(el)) {
      return {
        ...el,
        properties: stripExemptMarker(el.properties),
      } as unknown as Node;
    }
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
  fixture: "rules/builtin/clamp-line-height",
};

export default clampLineHeight;
