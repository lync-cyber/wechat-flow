import type { ThemeDefinition } from "@wechat-flow/contracts";
import type { Element, Root as HastRoot } from "hast";
import { fromHtml } from "hast-util-from-html";
import { describeToken } from "../registry/token.ts";

const PLACEHOLDER_RE = /\{\{([^}]+)\}\}/g;

export function resolveTokenPlaceholders(svg: string, themeId?: string): string {
  return svg.replace(PLACEHOLDER_RE, (match, tokenId: string) => {
    const token = describeToken(tokenId.trim());
    if (!token) return match;
    return (themeId && token.themeOverrides?.[themeId]) ?? token.value;
  });
}

function parseSvgToElements(svg: string): Element[] {
  const root = fromHtml(svg, { fragment: true });
  return root.children.filter((c): c is Element => c.type === "element");
}

function prependChildren(el: Element, prefix: Element[]): Element {
  return { ...el, children: [...prefix, ...el.children] };
}

function injectDecorationsIntoTree(
  node: HastRoot | Element,
  assets: Record<string, string>,
  themeId: string | undefined
): HastRoot | Element {
  if (node.type === "element") {
    const el = node as Element;
    const tag = el.tagName;
    const isHeading = /^h[1-6]$/.test(tag);

    const newChildren = el.children.map((child) => {
      if (child.type === "element") {
        return injectDecorationsIntoTree(child as Element, assets, themeId) as Element;
      }
      return child;
    });

    const mappedEl: Element = { ...el, children: newChildren };

    if (isHeading) {
      const assetKey = `heading.${tag}`;
      const svgRaw = assets[assetKey];
      if (svgRaw) {
        const resolved = resolveTokenPlaceholders(svgRaw, themeId);
        const prefix = parseSvgToElements(resolved);
        if (prefix.length > 0) {
          return prependChildren(mappedEl, prefix);
        }
      }
    }

    return mappedEl;
  }

  const root = node as HastRoot;
  return {
    ...root,
    children: root.children.map((child) => {
      if (child.type === "element") {
        return injectDecorationsIntoTree(child as Element, assets, themeId) as Element;
      }
      return child;
    }),
  };
}

export function injectDecorations(hast: HastRoot, theme?: ThemeDefinition): HastRoot {
  const assets = theme?.assets;
  if (!assets || Object.keys(assets).length === 0) return hast;
  return injectDecorationsIntoTree(hast, assets, theme?.id) as HastRoot;
}
