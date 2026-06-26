import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const kpiCard = defineBlock(
  "kpi-card",
  "数据指标卡",
  z.object({
    label: z.string(),
    value: z.string(),
    unit: z.string().optional(),
    trend: z.enum(["up", "down", "flat"]).optional(),
    description: z.string().optional(),
  }),
  [
    { id: "default", label: "标准指标卡" },
    { id: "highlight", label: "强调指标卡" },
    { id: "compact", label: "紧凑指标卡" },
  ],
  {
    root: {
      "text-align": "center",
      padding: "20px 16px",
      margin: "12px 0",
      "border-radius": "8px",
      border: "1px solid #e8e8e8",
      "background-color": "#ffffff",
    },
  }
);
