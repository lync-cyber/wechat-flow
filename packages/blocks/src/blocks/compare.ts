import { z } from "zod";
import { defineBlock } from "../factory.ts";

const sideSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const compare = defineBlock(
  "compare",
  "对比",
  z.object({
    left: sideSchema,
    right: sideSchema,
    title: z.string().optional(),
  }),
  [
    { id: "default", label: "标准对比" },
    { id: "highlight-right", label: "突出右侧" },
    { id: "table-style", label: "表格对比" },
  ]
);
