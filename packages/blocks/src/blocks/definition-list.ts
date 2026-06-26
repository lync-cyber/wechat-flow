import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const definitionList = defineBlock(
  "definition-list",
  "定义列表",
  z.object({
    items: z.array(
      z.object({
        term: z.string(),
        definition: z.string(),
      })
    ),
  }),
  [
    { id: "default", label: "标准定义列表" },
    { id: "two-column", label: "双列定义列表" },
    { id: "card-style", label: "卡片式定义列表" },
  ],
  {
    root: {
      margin: "16px 0",
      padding: "0",
      "border-top": "1px solid #e8e8e8",
    },
  }
);
