import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const authorCard = defineBlock(
  "author-card",
  "作者卡片",
  z.object({
    name: z.string(),
    bio: z.string().optional(),
    avatar: z.string().optional(),
    title: z.string().optional(),
  }),
  [
    { id: "default", label: "横排作者" },
    { id: "centered", label: "居中作者" },
    { id: "minimal", label: "简约作者" },
  ],
  {
    root: {
      display: "flex",
      "align-items": "center",
      gap: "12px",
      padding: "16px",
      margin: "16px 0",
      "border-radius": "8px",
      "background-color": "#f9f9f9",
    },
  }
);
