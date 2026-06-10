import { z } from "zod";
import { defineBlock } from "../factory.ts";

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
  [
    { id: "grid", label: "网格图集" },
    { id: "masonry", label: "瀑布流图集" },
    { id: "carousel", label: "轮播图集" },
  ]
);
