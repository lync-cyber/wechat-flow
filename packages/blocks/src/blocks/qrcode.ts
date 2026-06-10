import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const qrcode = defineBlock(
  "qrcode",
  "二维码",
  z.object({
    url: z.string(),
    caption: z.string().optional(),
    size: z.number().optional(),
  }),
  [
    { id: "default", label: "标准二维码" },
    { id: "with-logo", label: "带 Logo 二维码" },
    { id: "card", label: "卡片二维码" },
  ]
);
