import type { ThemeDefinition } from "@wechat-flow/contracts";
import type { Element, Root as HastRoot } from "hast";

export const DIVIDER_SVG_VARIANTS = new Set(["wave", "dots", "flower"]);

function svgStyle(verticalMargin: string): string {
  return `display: block; margin: ${verticalMargin} auto`;
}

function buildWaveSvg(colorBorder: string): Element {
  return {
    type: "element",
    tagName: "svg",
    properties: {
      viewBox: "0 0 240 20",
      style: svgStyle("24px"),
    },
    children: [
      {
        type: "element",
        tagName: "path",
        properties: {
          d: "M0,10 C40,2 80,18 120,10 C160,2 200,18 240,10",
          stroke: colorBorder,
          strokeWidth: "1.5",
          fill: "none",
        },
        children: [],
      },
    ],
  };
}

function buildDotsSvg(colorBorderStrong: string): Element {
  return {
    type: "element",
    tagName: "svg",
    properties: {
      viewBox: "0 0 60 10",
      style: svgStyle("20px"),
    },
    children: [20, 30, 40].map((cx) => ({
      type: "element",
      tagName: "circle",
      properties: { cx: String(cx), cy: "5", r: "2", fill: colorBorderStrong },
      children: [],
    })),
  };
}

function buildFlowerSvg(colorBorder: string, colorBrand: string): Element {
  return {
    type: "element",
    tagName: "svg",
    properties: {
      viewBox: "0 0 200 20",
      style: svgStyle("24px"),
    },
    children: [
      {
        type: "element",
        tagName: "line",
        properties: { x1: "0", y1: "10", x2: "90", y2: "10", stroke: colorBorder },
        children: [],
      },
      {
        type: "element",
        tagName: "path",
        properties: {
          d: "M100,6 L104,10 L100,14 L96,10 Z",
          fill: colorBrand,
        },
        children: [],
      },
      {
        type: "element",
        tagName: "line",
        properties: { x1: "110", y1: "10", x2: "200", y2: "10", stroke: colorBorder },
        children: [],
      },
    ],
  };
}

function buildDividerSvg(
  variantId: string,
  colorBorder: string,
  colorBorderStrong: string,
  colorBrand: string
): Element | null {
  if (variantId === "wave") return buildWaveSvg(colorBorder);
  if (variantId === "dots") return buildDotsSvg(colorBorderStrong);
  if (variantId === "flower") return buildFlowerSvg(colorBorder, colorBrand);
  return null;
}

function walk(node: Element, tokens: Record<string, string>): Element {
  const props = node.properties ?? {};
  const dataBlock = props["data-block"];
  const dataVariant = props["data-variant"];

  if (
    dataBlock === "divider" &&
    typeof dataVariant === "string" &&
    DIVIDER_SVG_VARIANTS.has(dataVariant)
  ) {
    const colorBorder = tokens["--color-border"] ?? "#D6D3CE";
    const colorBorderStrong = tokens["--color-border-strong"] ?? "#A8A29E";
    const colorBrand = tokens["--color-brand"] ?? "#2D5A4E";
    const svg = buildDividerSvg(dataVariant, colorBorder, colorBorderStrong, colorBrand);
    if (svg) {
      return { ...node, children: [svg] };
    }
  }

  const newChildren = node.children.map((child) =>
    child.type === "element" ? walk(child as Element, tokens) : child
  );
  return { ...node, children: newChildren };
}

export function injectDividerDecorations(hast: HastRoot, theme?: ThemeDefinition): HastRoot {
  const tokens = theme?.tokens ?? {};
  return {
    ...hast,
    children: hast.children.map((child) =>
      child.type === "element" ? walk(child as Element, tokens) : child
    ),
  };
}
