import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const heading = defineBlock(
  "heading",
  "标题",
  z.object({
    level: z.number().int().min(1).max(6).default(2),
    text: z.string(),
    align: z.enum(["left", "center", "right"]).optional(),
  }),
  [
    { id: "default", label: "默认标题" },
    { id: "underline", label: "下划线标题" },
    { id: "centered", label: "居中标题" },
  ]
);
