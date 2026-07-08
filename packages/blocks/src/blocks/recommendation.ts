import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const recommendation = defineBlock(
  "recommendation",
  "推荐阅读",
  z.object({}).strict(),
  "marketing",
  [
    { id: "default", label: "列表推荐" },
    { id: "card", label: "卡片推荐" },
    { id: "compact", label: "紧凑推荐" },
  ]
);
