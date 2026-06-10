import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const highlightBlock = defineBlock(
  "highlight-block",
  "高亮块",
  z.object({
    text: z.string(),
    color: z.string().optional(),
  }),
  [
    { id: "default", label: "默认高亮" },
    { id: "gradient", label: "渐变高亮" },
    { id: "bold", label: "粗体高亮" },
  ]
);
