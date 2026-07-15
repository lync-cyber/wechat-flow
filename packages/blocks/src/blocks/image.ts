import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const image = defineBlock("image", "图片", z.object({}).strict(), "media", [
  { id: "default", label: "普通图片" },
  {
    id: "rounded",
    label: "圆角图片",
    baseStyle: {
      root: { "border-radius": "8px" },
    },
  },
  {
    id: "full-width",
    label: "全宽图片",
    baseStyle: {
      root: { width: "100%" },
    },
  },
]);
