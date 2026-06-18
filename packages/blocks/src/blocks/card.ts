import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const card = defineBlock(
  "card",
  "卡片",
  z.object({
    title: z.string(),
    body: z.string(),
    image: z.string().optional(),
    link: z.string().optional(),
  }),
  [
    { id: "default", label: "普通卡片" },
    { id: "elevated", label: "阴影卡片" },
    { id: "outlined", label: "描边卡片" },
  ],
  {
    root: {
      border: "1px solid #e0e0e0",
      "border-radius": "8px",
      padding: "16px",
      margin: "12px 0",
    },
  }
);
