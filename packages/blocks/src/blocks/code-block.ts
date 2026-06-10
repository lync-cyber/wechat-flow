import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const codeBlock = defineBlock(
  "code-block",
  "代码块",
  z.object({
    code: z.string(),
    lang: z.string().optional(),
    filename: z.string().optional(),
  }),
  [
    { id: "default", label: "暗色代码块" },
    { id: "light", label: "亮色代码块" },
    { id: "minimal", label: "简约代码块" },
  ]
);
