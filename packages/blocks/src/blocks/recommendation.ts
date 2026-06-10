import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const recommendation = defineBlock(
  "recommendation",
  "推荐阅读",
  z.object({
    items: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        cover: z.string().optional(),
        summary: z.string().optional(),
      })
    ),
  }),
  [
    { id: "default", label: "列表推荐" },
    { id: "card", label: "卡片推荐" },
    { id: "compact", label: "紧凑推荐" },
  ]
);
