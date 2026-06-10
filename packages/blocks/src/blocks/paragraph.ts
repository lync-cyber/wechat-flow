import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const paragraph = defineBlock(
  "paragraph",
  "段落",
  z.object({
    text: z.string(),
    indent: z.boolean().optional(),
  }),
  [
    { id: "default", label: "普通段落" },
    { id: "indented", label: "首行缩进" },
    { id: "spaced", label: "宽松行距" },
  ]
);
