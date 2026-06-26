import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const relatedCards = defineBlock(
  "related-cards",
  "相关文章",
  z.object({
    items: z.array(
      z.object({
        title: z.string(),
        url: z.string().optional(),
        summary: z.string().optional(),
        image: z.string().optional(),
      })
    ),
    title: z.string().optional(),
  }),
  [
    { id: "default", label: "标准相关文章" },
    { id: "compact", label: "紧凑相关文章" },
    { id: "grid", label: "网格相关文章" },
  ],
  {
    root: {
      margin: "24px 0",
      padding: "16px",
      "border-radius": "8px",
      "background-color": "#f9f9f9",
      "border-top": "2px solid #e0e0e0",
    },
  }
);
