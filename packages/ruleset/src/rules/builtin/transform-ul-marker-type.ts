import type { Element, ElementContent, Node, Text } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { parseDeclarations } from "./css-helpers.ts";

const MARKER_MAP: Record<string, string> = {
  disc: "•",
  circle: "◦",
  square: "■",
};

function getMarkerChar(ul: Element): string | null {
  const style = ul.properties?.style;
  if (typeof style !== "string") return null;
  const decls = parseDeclarations(style);
  const entry = decls.find(([prop]) => prop === "list-style-type");
  if (!entry) return null;
  return MARKER_MAP[entry[1].trim()] ?? null;
}

function prependMarker(li: Element, marker: string): Element {
  const markerText: Text = { type: "text", value: `${marker} ` };
  return { ...li, children: [markerText, ...(li.children as ElementContent[])] };
}

function hasMarkerType(node: Node): boolean {
  const el = node as Element;
  if (el.type !== "element" || el.tagName !== "ul") return false;
  return getMarkerChar(el) !== null;
}

const transformUlMarkerType: RuleDefinition = {
  id: "transform-ul-marker-type",
  scope: "transform",
  priority: 60,
  matcher: hasMarkerType,
  transform: (node: Node): Node => {
    const ul = node as Element;
    const marker = getMarkerChar(ul);
    if (!marker) return ul;
    const newChildren = ul.children.map((child) => {
      if (child.type === "element" && child.tagName === "li") {
        return prependMarker(child as Element, marker);
      }
      return child;
    });
    return { ...ul, children: newChildren } as unknown as Node;
  },
};

export default transformUlMarkerType;
