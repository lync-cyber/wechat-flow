import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { parseDeclarations, serializeDeclarations } from "./css-helpers.ts";

const MIN_ALPHA = 0.15;

function hasRgbaLowAlpha(node: Node): boolean {
  const el = node as Element;
  if (el.type !== "element") return false;
  const style = el.properties?.style;
  if (typeof style !== "string") return false;
  return parseDeclarations(style).some(([, val]) => {
    const m = val.match(/rgba\s*\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/);
    if (!m) return false;
    return Number.parseFloat(m[1]) < MIN_ALPHA;
  });
}

function clampRgbaInValue(val: string): string {
  return val.replace(
    /rgba\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/g,
    (_match, r, g, b, a) => {
      const alpha = Number.parseFloat(a);
      const clamped = alpha < MIN_ALPHA ? MIN_ALPHA : alpha;
      return `rgba(${r},${g},${b},${clamped})`;
    }
  );
}

const clampRgbaAlpha: RuleDefinition = {
  id: "clamp-rgba-alpha",
  scope: "clamp",
  priority: 70,
  matcher: hasRgbaLowAlpha,
  transform: (node: Node): Node => {
    const el = node as Element;
    const style = el.properties?.style as string;
    const decls = parseDeclarations(style);
    const updated = decls.map(([prop, val]): [string, string] => [prop, clampRgbaInValue(val)]);
    return {
      ...el,
      properties: { ...el.properties, style: serializeDeclarations(updated) },
    } as unknown as Node;
  },
};

export default clampRgbaAlpha;
