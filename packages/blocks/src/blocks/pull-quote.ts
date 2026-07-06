import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const pullQuote = defineBlock(
  "pull-quote",
  "摘引",
  z.object({
    text: z.string(),
    author: z.string().optional(),
  }),
  "emphasis",
  [
    { id: "default", label: "标准摘引" },
    { id: "large", label: "大字摘引" },
    {
      id: "decorated",
      label: "装饰摘引",
      baseStyle: {
        root: {
          "text-align": "center",
          padding: "24px 16px",
          margin: "24px 0",
          "font-size": "1.25em",
        },
        "quote-mark": {
          position: "relative",
          display: "inline-block",
          "vertical-align": "top",
          "line-height": "1",
          "font-size": "28px",
          opacity: "0.35",
          color: "#2D5A4E",
        },
        author: {
          "margin-top": "10px",
          "text-align": "center",
          "font-size": "13px",
          color: "#78716C",
        },
      },
    },
    { id: "minimal", label: "简约摘引" },
    { id: "bordered", label: "边框摘引" },
  ],
  {
    root: {
      "text-align": "center",
      padding: "24px 16px",
      margin: "24px 0",
      "font-size": "1.25em",
    },
  },
  ["root", "quote-mark", "author"]
);
