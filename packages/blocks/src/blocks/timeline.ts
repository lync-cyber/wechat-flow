import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const timeline = defineBlock(
  "timeline",
  "时间线",
  z.object({
    events: z.array(
      z.object({
        date: z.string(),
        text: z.string(),
        title: z.string().optional(),
      })
    ),
  }),
  [
    { id: "default", label: "竖向时间线" },
    { id: "horizontal", label: "横向时间线" },
    { id: "compact", label: "紧凑时间线" },
  ]
);
