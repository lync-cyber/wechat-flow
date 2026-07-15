import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const citation = defineBlock(
  "citation",
  "学术引用",
  z.object({}).strict(),
  "meta",
  [
    { id: "default", label: "标准学术引用" },
    {
      id: "footnote-style",
      label: "脚注式引用",
      baseStyle: {
        root: {
          "border-left": "none",
          "border-top": "2px solid var(--color-brand)",
          padding: "14px 0 4px 2.4em",
          "text-indent": "-2.4em",
          "font-size": "0.6875em",
          "line-height": "1.45",
        },
      },
    },
    {
      id: "inline-link",
      label: "行内链接引用",
      baseStyle: {
        root: {
          "border-left": "none",
          padding: "0",
          margin: "0",
          "text-decoration": "underline",
          color: "var(--color-link)",
        },
      },
    },
  ],
  {
    baseStyle: {
      root: {
        "border-left": "3px solid #ccc",
        padding: "8px 12px",
        margin: "12px 0",
        "font-size": "0.9em",
        color: "#666",
      },
    },
  }
);
