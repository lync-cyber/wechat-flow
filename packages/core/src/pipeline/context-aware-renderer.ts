import type { ThemeDefinition } from "@wechat-flow/contracts";
import type { Element, Root as HastRoot } from "hast";

export function withinBlock(ancestors: Element[], blockId: string): boolean {
  return ancestors.some((a) => a.type === "element" && a.properties?.["data-block"] === blockId);
}

function visitElement(el: Element, ancestors: Element[]): Element {
  const isHeading = /^h[1-6]$/.test(el.tagName);
  const currentAncestors = [...ancestors, el];

  const newChildren = el.children.map((child) => {
    if (child.type === "element") {
      return visitElement(child as Element, currentAncestors);
    }
    return child;
  });

  if (isHeading) {
    const cls = withinBlock(ancestors, "callout") ? "in-callout" : "standalone";
    const { class: _c, className: _cn, ...restProps } = el.properties ?? {};
    return {
      ...el,
      properties: { ...restProps, className: [cls] },
      children: newChildren,
    };
  }

  return { ...el, children: newChildren };
}

export function contextAwareRender(hast: HastRoot, theme?: ThemeDefinition): HastRoot {
  const assets = theme?.assets;
  if (!assets || Object.keys(assets).length === 0) return hast;

  return {
    ...hast,
    children: hast.children.map((child) => {
      if (child.type === "element") {
        return visitElement(child as Element, []);
      }
      return child;
    }),
  };
}
