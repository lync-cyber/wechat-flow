import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const steps = defineBlock(
  "steps",
  "步骤",
  z.object({
    steps: z.array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
      })
    ),
  }),
  [
    { id: "default", label: "竖排步骤" },
    { id: "horizontal", label: "横排步骤" },
    { id: "numbered", label: "编号步骤" },
    { id: "circle-numbered", label: "圆圈编号步骤" },
    { id: "timeline", label: "时间线步骤" },
    { id: "arrow", label: "箭头步骤" },
    { id: "card", label: "卡片步骤" },
    { id: "minimal", label: "简约步骤" },
    { id: "filled", label: "填充步骤" },
    { id: "compact", label: "紧凑步骤" },
  ],
  {
    root: {
      margin: "16px 0",
      padding: "0",
    },
  }
);
