import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const quote = defineBlock(
  "quote",
  "引用",
  z.object({
    text: z.string(),
    author: z.string().optional(),
    source: z.string().optional(),
  }),
  [
    { id: "default", label: "标准引用" },
    { id: "bordered", label: "边框引用" },
    { id: "centered", label: "居中引用" },
    { id: "filled", label: "填充引用" },
    { id: "minimal", label: "简约引用" },
    { id: "large", label: "大字引用" },
    { id: "italic", label: "斜体引用" },
    { id: "card", label: "卡片引用" },
    { id: "magazine", label: "杂志风引用" },
    { id: "literary", label: "文艺风引用" },
  ],
  {
    root: {
      "border-left": "3px solid #888",
      padding: "8px 16px",
      margin: "16px 0",
      color: "#555",
    },
  }
);
