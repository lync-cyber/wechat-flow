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
  "text",
  [
    { id: "default", label: "标准引用" },
    { id: "bordered", label: "边框引用" },
    { id: "centered", label: "居中引用" },
    { id: "filled", label: "填充引用" },
    { id: "minimal", label: "简约引用" },
    { id: "large", label: "大字引用" },
    { id: "italic", label: "斜体引用" },
    { id: "card", label: "卡片引用" },
    {
      id: "large-quote-mark",
      label: "大引号引用",
      baseStyle: {
        root: {
          "border-left": "3px solid #888",
          padding: "8px 16px",
          margin: "16px 0",
          color: "#555",
        },
        "quote-mark": {
          "font-size": "2em",
          color: "#2D5A4E",
          opacity: "0.4",
          "line-height": "0.6",
          display: "inline-block",
          "vertical-align": "top",
          "margin-right": "4px",
        },
      },
    },
    {
      id: "dropcap",
      label: "首字下沉引用",
      baseStyle: {
        root: {
          "border-left": "3px solid #888",
          padding: "8px 16px",
          margin: "16px 0",
          color: "#555",
        },
        dropcap: {
          "font-size": "2.2em",
          "font-weight": "700",
          color: "#2D5A4E",
          display: "inline-block",
          "vertical-align": "top",
          "margin-right": "4px",
          "font-family":
            "'LXGW WenKai', 'Source Han Serif CN', 'Noto Serif CJK SC', Georgia, serif",
        },
      },
    },
  ],
  {
    root: {
      "border-left": "3px solid #888",
      padding: "8px 16px",
      margin: "16px 0",
      color: "#555",
    },
  },
  ["root", "quote-mark", "dropcap"]
);
