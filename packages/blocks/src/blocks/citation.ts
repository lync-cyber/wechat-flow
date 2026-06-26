import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const citation = defineBlock(
  "citation",
  "学术引用",
  z.object({
    text: z.string(),
    source: z.string().optional(),
    url: z.string().optional(),
    year: z.number().int().optional(),
    author: z.string().optional(),
  }),
  [
    { id: "default", label: "标准学术引用" },
    { id: "footnote-style", label: "脚注式引用" },
    { id: "inline-link", label: "行内链接引用" },
  ],
  {
    root: {
      "border-left": "3px solid #ccc",
      padding: "8px 12px",
      margin: "12px 0",
      "font-size": "0.9em",
      color: "#666",
    },
  }
);
