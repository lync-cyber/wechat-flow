import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const announcement = defineBlock(
  "announcement",
  "公告",
  z.object({}).strict(),
  "emphasis",
  [
    {
      id: "default",
      label: "标准公告",
      baseStyle: {
        root: {
          background: "#f3f0eb",
        },
      },
    },
    {
      id: "danger-bar",
      label: "危险横幅公告",
      baseStyle: {
        root: {
          "border-top": "4px solid var(--color-accent)",
          "border-left": "3px solid var(--color-accent)",
          padding: "12px 16px",
          background: "var(--color-surface-alt)",
        },
      },
    },
    {
      id: "compact",
      label: "紧凑公告",
      baseStyle: {
        root: {
          padding: "8px 12px",
          "border-left": "3px solid var(--color-brand)",
          "font-size": "var(--font-size-sm)",
        },
      },
    },
  ],
  {
    root: {
      "border-left": "3px solid #b94a3e",
      padding: "12px 16px",
    },
  }
);
