import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const highlightBlock = defineBlock(
  "highlight-block",
  "高亮块",
  z.object({}).strict(),
  "emphasis",
  [
    { id: "default", label: "默认高亮" },
    { id: "gradient", label: "渐变高亮" },
    {
      id: "bold",
      label: "粗体高亮",
      baseStyle: {
        root: {
          "font-weight": "700",
          "letter-spacing": "1.92px",
          "border-left": "2px solid var(--color-text-muted)",
          "background-color": "var(--color-surface-alt)",
          padding: "8px 0 8px 12px",
          margin: "16px 0",
        },
      },
    },
    {
      id: "underline",
      label: "下划线高亮",
      baseStyle: {
        root: {
          "border-bottom": "2px dotted var(--color-text-secondary)",
          "background-color": "var(--color-surface-alt)",
          padding: "10px 0 8px",
          margin: "16px 0",
        },
      },
    },
    {
      id: "background",
      label: "背景高亮",
      baseStyle: {
        root: {
          "background-color": "var(--color-surface-alt)",
          "line-height": "2",
          padding: "12px 14px",
          margin: "16px 0",
        },
      },
    },
  ]
);
