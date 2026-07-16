import type { Element } from "hast";
import { z } from "zod";
import { slotElement, textContentOf } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

function findFirstImage(children: Element["children"]): Element | undefined {
  for (const child of children) {
    if (child.type !== "element") continue;
    if (child.tagName === "img") return child;
    const nested = findFirstImage(child.children);
    if (nested) return nested;
  }
  return undefined;
}

function containsImage(node: Element): boolean {
  if (node.tagName === "img") return true;
  return node.children.some((child) => child.type === "element" && containsImage(child));
}

function buildSideLayout(element: Element): void {
  const image = findFirstImage(element.children);
  if (!image) return;

  const imageEl: Element = {
    type: "element",
    tagName: "img",
    properties: {
      "data-block-slot": "image",
      src: image.properties?.src,
      alt: image.properties?.alt ?? "",
    },
    children: [],
  };

  const captionText = element.children
    .filter((child): child is Element => child.type === "element" && !containsImage(child))
    .map((child) => textContentOf(child.children))
    .join("")
    .trim();

  const cells: Element[] = [slotElement("image-cell", [imageEl])];
  if (captionText.length > 0) {
    cells.push(slotElement("caption-cell", [{ type: "text", value: captionText }]));
  }

  element.children = cells;
}

export const imageCaption = defineBlock(
  "image-caption",
  "图片说明",
  z.object({}).strict(),
  "media",
  [
    { id: "default", label: "底部说明" },
    {
      id: "side",
      label: "侧边说明",
      baseStyle: {
        root: {
          display: "table",
          width: "100%",
          "table-layout": "fixed",
        },
        "image-cell": {
          display: "table-cell",
          width: "35%",
          "vertical-align": "top",
          padding: "4px",
        },
        "caption-cell": {
          display: "table-cell",
          "vertical-align": "middle",
          padding: "4px",
          color: "var(--color-text-muted)",
          "font-size": "var(--font-size-sm)",
        },
        image: { width: "100%" },
      },
    },
  ],
  {
    slots: ["root", "image-cell", "caption-cell", "image"],
    decorate: (element, ctx) => {
      if (ctx.variant !== "side") return;
      buildSideLayout(element);
    },
  }
);
