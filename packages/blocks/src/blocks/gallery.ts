import { z } from "zod";
import { defineBlock } from "../factory.ts";

const GALLERY_IMAGE_SLOT_STYLE = {
  image: {
    width: "100%",
    "border-radius": "3px",
  },
  caption: {
    "text-align": "center",
    "font-size": "13px",
    color: "#78716C",
  },
};

export const gallery = defineBlock(
  "gallery",
  "图集",
  z.object({
    images: z.array(
      z.object({
        src: z.string(),
        alt: z.string().optional(),
        caption: z.string().optional(),
      })
    ),
    columns: z.number().int().min(1).max(4).optional(),
  }),
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
  ["root", "row", "cell", "image", "caption"]
);
