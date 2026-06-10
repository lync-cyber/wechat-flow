import type { Element, Node } from "hast";

/** Parse `prop:value` pairs from an inline style string. */
export function parseDeclarations(style: string): Array<[string, string]> {
  return style
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const colonIdx = d.indexOf(":");
      if (colonIdx === -1) return null;
      return [d.slice(0, colonIdx).trim(), d.slice(colonIdx + 1).trim()] as [string, string];
    })
    .filter((pair): pair is [string, string] => pair !== null);
}

/** Rebuild an inline style string from `prop:value` pairs. */
export function serializeDeclarations(decls: Array<[string, string]>): string {
  return decls.map(([p, v]) => `${p}:${v}`).join(";");
}

/**
 * Return a new element node with named CSS declarations removed from its style attribute.
 * If none of the listed properties are present, returns the node unchanged (same reference).
 */
export function removeCssDeclarations(node: Node, propNames: string[]): Node {
  const el = node as Element;
  const style = el.properties?.style;
  if (typeof style !== "string") return node;

  const decls = parseDeclarations(style);
  const nameSet = new Set(propNames);
  const kept = decls.filter(([p]) => !nameSet.has(p));

  if (kept.length === decls.length) return node;

  const newStyle = serializeDeclarations(kept);
  return {
    ...el,
    properties: { ...el.properties, style: newStyle },
  } as Node;
}

/**
 * Return true if the node is an Element with the given tag name.
 */
export function isTag(node: Node, tagName: string): boolean {
  return node.type === "element" && (node as Element).tagName === tagName;
}

/**
 * Return true if the node is an Element whose style attribute contains any of the given CSS property names.
 */
export function hasStyleProp(node: Node, propNames: string[]): boolean {
  const el = node as Element;
  if (el.type !== "element") return false;
  const style = el.properties?.style;
  if (typeof style !== "string") return false;
  const nameSet = new Set(propNames);
  return parseDeclarations(style).some(([p]) => nameSet.has(p));
}
