import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const table = defineBlock(
  "table",
  "表格",
  z.object({
    headers: z.array(z.string()),
    rows: z.array(z.array(z.string())),
    caption: z.string().optional(),
  }),
  [
    { id: "default", label: "标准表格" },
    { id: "striped", label: "条纹表格" },
    { id: "bordered", label: "全边框表格" },
  ]
);
