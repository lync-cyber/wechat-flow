import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const warning = defineBlock(
  "warning",
  "警告块",
  z.object({
    text: z.string(),
    title: z.string().optional(),
    severity: z.enum(["low", "medium", "high"]).optional(),
  }),
  [
    { id: "default", label: "标准警告" },
    { id: "banner", label: "横幅警告" },
    { id: "inline", label: "行内警告" },
  ],
  {
    root: {
      "border-left": "4px solid #e53e3e",
      padding: "12px 16px",
      "border-radius": "4px",
      margin: "16px 0",
      "background-color": "#fff5f5",
    },
  }
);
