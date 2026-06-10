import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const callout = defineBlock(
  "callout",
  "提示框",
  z.object({
    type: z.enum(["info", "warning", "success", "error"]).default("info"),
    text: z.string(),
    title: z.string().optional(),
  }),
  [
    { id: "default", label: "默认提示" },
    { id: "filled", label: "填充提示" },
    { id: "minimal", label: "简约提示" },
  ]
);
