import type { Element, Node, Parent } from "hast";
import type { RuleDefinition } from "../registry.ts";
import { parseDeclarations, serializeDeclarations } from "./css-helpers.ts";

function hasQuotedUrlFragment(node: Node): boolean {
  const el = node as Element;
  if (el.type !== "element") return false;
  const style = el.properties?.style;
  if (typeof style !== "string") return false;
  return /url\s*\(\s*["']#/.test(style);
}

function stripUrlQuotes(val: string): string {
  return val.replace(/url\s*\(\s*["']([^"']+)["']\s*\)/g, "url($1)");
}

function normalizeNode(node: Node): Node {
  const el = node as Element;
  if (el.type !== "element") return node;

  let updated: Element = el;
  const style = el.properties?.style;
  if (typeof style === "string" && /url\s*\(\s*["']#/.test(style)) {
    const decls = parseDeclarations(style);
    const updatedDecls = decls.map(([prop, val]): [string, string] => [prop, stripUrlQuotes(val)]);
    updated = {
      ...el,
      properties: { ...el.properties, style: serializeDeclarations(updatedDecls) },
    };
  }

  if ("children" in updated) {
    const parent = updated as unknown as Parent;
    return {
      ...parent,
      children: parent.children.map(normalizeNode),
    } as unknown as Node;
  }
  return updated;
}

function isInsideSvg(node: Node): boolean {
  const el = node as Element;
  return el.type === "element" && el.tagName === "svg";
}

const transformSvgUrlNormalize: RuleDefinition = {
  id: "transform-svg-url-normalize",
  scope: "transform",
  priority: 60,
  matcher: isInsideSvg,
  transform: (node: Node): Node => normalizeNode(node),
};

export default transformSvgUrlNormalize;
