import type { Element, Node } from "hast";
import type { RuleDefinition } from "../registry.ts";

function hasEventHandlers(node: Node): boolean {
  if (node.type !== "element") return false;
  return Object.keys((node as Element).properties).some((k) => k.startsWith("on"));
}

function removeEventHandlers(node: Node): Node {
  const el = node as Element;
  const filtered = Object.fromEntries(
    Object.entries(el.properties).filter(([k]) => !k.startsWith("on"))
  );
  return { ...el, properties: filtered } as Node;
}

const stripJsEvents: RuleDefinition = {
  id: "strip-js-events",
  scope: "strip",
  priority: 100,
  matcher: hasEventHandlers,
  transform: removeEventHandlers,
};

export default stripJsEvents;
