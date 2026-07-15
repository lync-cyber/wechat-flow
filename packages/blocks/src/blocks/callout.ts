import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const callout = defineBlock(
  "callout",
  "提示框",
  z.object({}).strict(),
  "emphasis",
  [
    {
      id: "tip",
      label: "小技巧提示",
      baseStyle: {
        root: {
          padding: "12px 16px",
          margin: "16px 0",
          "border-radius": "8px 0 8px 8px",
          "box-shadow": "inset -4px 0 0 0 var(--color-brand)",
          background: "var(--color-surface-alt)",
        },
      },
    },
    {
      id: "warning",
      label: "警告提示",
      baseStyle: {
        root: {
          padding: "12px 16px",
          margin: "16px 0",
          "border-top": "2px dashed var(--color-accent)",
          "border-bottom": "2px solid var(--color-accent)",
          background: "transparent",
        },
      },
    },
    {
      id: "info",
      label: "信息提示",
      baseStyle: {
        root: {
          padding: "12px 16px",
          margin: "16px 0",
          border: "1px solid var(--color-brand)",
          "box-shadow": "inset 0 2px 0 0 var(--color-brand), 0 1px 3px rgba(0,0,0,0.06)",
          background: "var(--color-background)",
        },
      },
    },
    {
      id: "danger",
      label: "危险提示",
      baseStyle: {
        root: {
          padding: "12px 16px",
          margin: "16px 0",
          "border-top": "8px solid var(--color-accent)",
          "border-radius": "0",
          background: "var(--color-surface-alt)",
        },
      },
    },
  ],
  {
    baseStyle: {
      root: {
        padding: "12px 16px",
        margin: "16px 0",
      },
    },
    defaultStyle: {
      root: {
        "border-left": "4px solid #4a90e2",
        "border-radius": "4px",
        "background-color": "#f0f7ff",
      },
    },
  }
);
