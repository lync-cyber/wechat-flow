import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const image = defineBlock(
  "image",
  "图片",
  z.object({
    src: z.string(),
    alt: z.string().optional(),
    width: z.number().optional(),
  }),
  [
    { id: "default", label: "普通图片" },
    { id: "rounded", label: "圆角图片" },
    { id: "full-width", label: "全宽图片" },
  ]
);
