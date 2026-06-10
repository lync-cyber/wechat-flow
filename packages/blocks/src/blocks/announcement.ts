import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const announcement = defineBlock(
  "announcement",
  "公告",
  z.object({
    text: z.string(),
    title: z.string().optional(),
    link: z.string().optional(),
  }),
  [
    { id: "default", label: "标准公告" },
    { id: "banner", label: "横幅公告" },
    { id: "compact", label: "紧凑公告" },
  ]
);
