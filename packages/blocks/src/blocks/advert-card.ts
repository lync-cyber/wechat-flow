import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const advertCard = defineBlock(
  "advert-card",
  "广告卡片",
  z.object({
    title: z.string(),
    description: z.string().optional(),
    image: z.string().optional(),
    link: z.string().optional(),
    cta: z.string().optional(),
    tag: z.string().optional(),
  }),
  [
    { id: "default", label: "标准广告卡片" },
    { id: "horizontal", label: "横排广告卡片" },
    { id: "minimal", label: "简约广告卡片" },
  ],
  {
    root: {
      border: "1px solid #e8d5a3",
      "border-radius": "8px",
      padding: "16px",
      margin: "16px 0",
      "background-color": "#fffdf0",
    },
  }
);
