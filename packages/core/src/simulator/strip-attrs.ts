import type { Element, Properties } from "hast";

export interface DroppedAttr {
  nodeSelector: string;
  attrName: string;
}

const STRIPPED_ATTRS = new Set(["id"]);

const STRIPPED_STYLE_PROPS = new Set(["position"]);

function buildSelector(el: Element, index: number): string {
  return `${el.tagName}:nth(${index})`;
}

export function stripAttrs(
  el: Element,
  nodeIndex: number
): { el: Element; dropped: DroppedAttr[] } {
  const dropped: DroppedAttr[] = [];
  const selector = buildSelector(el, nodeIndex);
  const newProps: Properties = {};

  for (const [key, value] of Object.entries(el.properties ?? {})) {
    if (STRIPPED_ATTRS.has(key)) {
      dropped.push({ nodeSelector: selector, attrName: key });
      continue;
    }
    if (key === "style" && typeof value === "string") {
      const filtered = filterStyleDeclarations(value);
      const removedProps = getStrippedStyleProps(value);
      for (const prop of removedProps) {
        dropped.push({ nodeSelector: selector, attrName: `style:${prop}` });
      }
      if (filtered.trim()) {
        newProps[key] = filtered;
      } else {
        dropped.push({ nodeSelector: selector, attrName: "style" });
      }
      continue;
    }
    (newProps as Record<string, unknown>)[key] = value;
  }

  return { el: { ...el, properties: newProps }, dropped };
}

function filterStyleDeclarations(style: string): string {
  return style
    .split(";")
    .map((decl) => decl.trim())
    .filter((decl) => {
      if (!decl) return false;
      const colonIdx = decl.indexOf(":");
      if (colonIdx === -1) return true;
      const prop = decl.slice(0, colonIdx).trim().toLowerCase();
      return !STRIPPED_STYLE_PROPS.has(prop);
    })
    .join(";");
}

function getStrippedStyleProps(style: string): string[] {
  const removed: string[] = [];
  for (const decl of style.split(";")) {
    const trimmed = decl.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const prop = trimmed.slice(0, colonIdx).trim().toLowerCase();
    if (STRIPPED_STYLE_PROPS.has(prop)) {
      removed.push(prop);
    }
  }
  return removed;
}
