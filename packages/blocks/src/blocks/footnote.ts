import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const footnote = defineBlock(
  "footnote",
  "脚注",
  z.object({
    text: z.string(),
    index: z.number().int().positive().optional(),
    source: z.string().optional(),
  }),
  [
    { id: "default", label: "标准脚注" },
    { id: "numbered", label: "编号脚注" },
    { id: "inline", label: "行内脚注" },
  ],
  {
    root: {
      "font-size": "12px",
      color: "#888888",
      padding: "8px 0",
      "border-top": "1px solid #e0e0e0",
      margin: "16px 0 0",
      "line-height": "1.6",
    },
  }
);
