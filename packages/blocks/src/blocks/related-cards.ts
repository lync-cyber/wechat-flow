import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const relatedCards = defineBlock(
  "related-cards",
  "相关文章",
  z.object({}).strict(),
  "marketing",
  [
    { id: "default", label: "标准相关文章" },
    { id: "compact", label: "紧凑相关文章" },
    { id: "grid", label: "网格相关文章" },
  ],
  {
    baseStyle: {
      root: {
        margin: "24px 0",
        padding: "16px",
        "border-radius": "8px",
        "background-color": "#f9f9f9",
        "border-top": "2px solid #e0e0e0",
      },
    },
  }
);
