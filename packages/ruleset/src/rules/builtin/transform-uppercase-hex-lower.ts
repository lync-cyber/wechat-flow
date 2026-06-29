import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { parseDeclarations, serializeDeclarations } from "./css-helpers.ts";

// Match hex colors with at least one uppercase letter A-F
const UPPER_HEX_RE = /#[0-9A-Fa-f]{3,6}\b/g;
const HAS_UPPER_HEX_RE = /#[0-9A-F]{3,6}\b/;

function styleHasUpperHex(node: Node): boolean {
  if (node.type !== "element") return false;
  const el = node as Element;
  const style = el.properties?.style;
  if (typeof style !== "string") return false;
  return HAS_UPPER_HEX_RE.test(style);
}

const transformUppercaseHexLower: RuleDefinition = {
  id: "transform-uppercase-hex-lower",
  scope: "transform",
  priority: 70,
  matcher: styleHasUpperHex,
  transform: (node: Node): Node => {
    const el = node as Element;
    const style = el.properties?.style as string;
    const decls = parseDeclarations(style);
    const updated = decls.map(([prop, val]): [string, string] => {
      const newVal = val.replace(UPPER_HEX_RE, (hex) => hex.toLowerCase());
      return [prop, newVal];
    });
    return {
      ...el,
      properties: { ...el.properties, style: serializeDeclarations(updated) },
    } as unknown as Node;
  },
};

export default transformUppercaseHexLower;
