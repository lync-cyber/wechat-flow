import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const miniprogramCard = defineBlock(
  "miniprogram-card",
  "小程序卡片",
  z.object({
    appId: z.string(),
    path: z.string(),
    title: z.string(),
    thumbnail: z.string().optional(),
  }),
  [
    { id: "default", label: "标准小程序卡片" },
    { id: "large", label: "大图小程序卡片" },
    { id: "compact", label: "紧凑小程序卡片" },
  ]
);
