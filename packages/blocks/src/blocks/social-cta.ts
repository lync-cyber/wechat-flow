import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const socialCta = defineBlock(
  "social-cta",
  "社交行动引导",
  z.object({
    platform: z.string(),
    action: z.string(),
    description: z.string().optional(),
    icon: z.string().optional(),
    url: z.string().optional(),
  }),
  [
    { id: "default", label: "标准社交引导" },
    { id: "icon-left", label: "图标左置引导" },
    { id: "full-width", label: "全宽社交引导" },
  ],
  {
    root: {
      display: "table",
      width: "100%",
      padding: "14px 16px",
      margin: "16px 0",
      "border-radius": "8px",
      "background-color": "#f0faf0",
      border: "1px solid #b2ddb2",
    },
  }
);
