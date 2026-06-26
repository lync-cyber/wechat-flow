import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const disclaimer = defineBlock(
  "disclaimer",
  "免责声明",
  z.object({
    text: z.string(),
    title: z.string().optional(),
    compact: z.boolean().optional(),
  }),
  [
    { id: "default", label: "标准免责声明" },
    { id: "compact", label: "紧凑免责声明" },
    { id: "bordered", label: "边框免责声明" },
  ],
  {
    root: {
      padding: "12px 16px",
      margin: "16px 0",
      "border-radius": "4px",
      "background-color": "#f7f7f7",
      "font-size": "0.875em",
      color: "#888",
    },
  }
);
