import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const divider = defineBlock(
  "divider",
  "分隔线",
  z.object({
    style: z.enum(["solid", "dashed", "dotted"]).optional(),
    label: z.string().optional(),
  }),
  [
    { id: "default", label: "细线分隔" },
    { id: "thick", label: "粗线分隔" },
    { id: "decorative", label: "装饰分隔" },
    { id: "dotted", label: "点线分隔" },
    { id: "dashed", label: "虚线分隔" },
  ]
);
