import type { Element } from "hast";
import { z } from "zod";
import { slotElement } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

const GALLERY_IMAGE_SLOT_STYLE = {
  image: {
    width: "100%",
    "border-radius": "3px",
  },
  caption: {
    "text-align": "center",
    "font-size": "var(--font-size-sm)",
    color: "var(--color-text-muted)",
  },
};

const GALLERY_COLUMNS_BY_VARIANT: Record<string, number> = {
  duo: 2,
  triptych: 3,
  grid: 2,
  masonry: 3,
  carousel: 3,
};

function buildGalleryCell(img: Element): Element {
  const props = img.properties ?? {};
  const caption = props.title;

  const imageEl: Element = {
    type: "element",
    tagName: "img",
    properties: { "data-block-slot": "image", src: props.src, alt: props.alt ?? "" },
    children: [],
  };

  const cellChildren: Element[] = [imageEl];
  if (typeof caption === "string" && caption.trim() !== "") {
    cellChildren.push(slotElement("caption", [{ type: "text", value: caption }]));
  }

  return slotElement("cell", cellChildren);
}

function extractGalleryImages(ul: Element): Element[] {
  const listItems = ul.children.filter(
    (child): child is Element => child.type === "element" && child.tagName === "li"
  );
  const images: Element[] = [];
  for (const li of listItems) {
    for (const child of li.children) {
      if (child.type === "element" && child.tagName === "img") {
        images.push(child);
      } else if (child.type === "element" && child.tagName === "p") {
        const nestedImg = child.children.find(
          (grandchild): grandchild is Element =>
            grandchild.type === "element" && grandchild.tagName === "img"
        );
        if (nestedImg) images.push(nestedImg);
      }
    }
  }
  return images;
}

function buildGalleryRows(ul: Element, variant: string): Element[] {
  const columns = GALLERY_COLUMNS_BY_VARIANT[variant] ?? 2;
  const images = extractGalleryImages(ul);
  const rows: Element[] = [];
  for (let i = 0; i < images.length; i += columns) {
    const group = images.slice(i, i + columns);
    rows.push(
      slotElement(
        "row",
        group.map((img) => buildGalleryCell(img))
      )
    );
  }
  return rows;
}

export const gallery = defineBlock(
  "gallery",
  "图集",
  z.object({}).strict(),
  "media",
  [
    {
      id: "duo",
      label: "双列图集",
      baseStyle: {
        root: {
          display: "table",
          width: "100%",
        },
        row: {
          display: "table-row",
        },
        cell: {
          display: "table-cell",
          width: "50%",
          padding: "4px",
        },
        ...GALLERY_IMAGE_SLOT_STYLE,
      },
    },
    {
      id: "triptych",
      label: "三宫格图集",
      baseStyle: {
        root: {
          display: "table",
          width: "100%",
        },
        row: {
          display: "table-row",
        },
        cell: {
          display: "table-cell",
          width: "33.33%",
          padding: "3px",
        },
        ...GALLERY_IMAGE_SLOT_STYLE,
      },
    },
    { id: "grid", label: "网格图集" },
    { id: "masonry", label: "瀑布流图集" },
    { id: "carousel", label: "轮播图集" },
  ],
  undefined,
  ["root", "row", "cell", "image", "caption"],
  undefined,
  (element, ctx) => {
    const authoredVariant = ctx.variant;
    const effectiveVariant = GALLERY_COLUMNS_BY_VARIANT[authoredVariant] === 3 ? "triptych" : "duo";
    const ul = element.children.find(
      (child): child is Element => child.type === "element" && child.tagName === "ul"
    );
    if (!ul) return;
    const rows = buildGalleryRows(ul, authoredVariant);
    element.properties = { ...element.properties, "data-variant": effectiveVariant };
    element.children = rows;
  }
);
