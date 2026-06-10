import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const imageCaption = defineBlock(
  "image-caption",
  "图片说明",
  z.object({
    src: z.string(),
    caption: z.string(),
    alt: z.string().optional(),
  }),
  [
    { id: "default", label: "底部说明" },
    { id: "overlay", label: "覆盖说明" },
    { id: "side", label: "侧边说明" },
  ]
);
