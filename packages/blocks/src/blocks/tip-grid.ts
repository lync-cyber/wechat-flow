import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const tipGrid = defineBlock(
  "tip-grid",
  "提示网格",
  z.object({}).strict(),
  "emphasis",
  [
    { id: "default", label: "标准提示网格" },
    { id: "two-column", label: "双列提示网格" },
    { id: "card-style", label: "卡片式提示网格" },
  ],
  {
    baseStyle: {
      root: {
        display: "table",
        width: "100%",
        margin: "16px 0",
        "border-collapse": "separate",
        "border-spacing": "8px",
      },
    },
  }
);
