import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const video = defineBlock(
  "video",
  "视频",
  z.object({
    src: z.string(),
    poster: z.string().optional(),
    caption: z.string().optional(),
  }),
  [
    { id: "default", label: "标准视频" },
    { id: "autoplay", label: "自动播放" },
    { id: "with-caption", label: "带说明视频" },
  ]
);
