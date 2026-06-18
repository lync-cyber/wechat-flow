import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const pullQuote = defineBlock(
  "pull-quote",
  "摘引",
  z.object({
    text: z.string(),
    author: z.string().optional(),
  }),
  [
    { id: "default", label: "标准摘引" },
    { id: "large", label: "大字摘引" },
    { id: "decorated", label: "装饰摘引" },
  ],
  {
    root: {
      "text-align": "center",
      padding: "24px 16px",
      margin: "24px 0",
      "font-size": "1.25em",
    },
  }
);
