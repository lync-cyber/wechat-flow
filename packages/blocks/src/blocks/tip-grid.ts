import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const tipGrid = defineBlock(
  "tip-grid",
  "提示网格",
  z.object({
    items: z.array(
      z.object({
        icon: z.string().optional(),
        text: z.string(),
        title: z.string().optional(),
      })
    ),
    columns: z.number().int().min(1).max(4).optional(),
  }),
  [
    { id: "default", label: "标准提示网格" },
    { id: "two-column", label: "双列提示网格" },
    { id: "card-style", label: "卡片式提示网格" },
  ],
  {
    root: {
      display: "table",
      width: "100%",
      margin: "16px 0",
      "border-collapse": "separate",
      "border-spacing": "8px",
    },
  }
);
