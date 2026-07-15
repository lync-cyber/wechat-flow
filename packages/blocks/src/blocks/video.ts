import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const video = defineBlock("video", "视频", z.object({}).strict(), "media", [
  { id: "default", label: "标准视频" },
]);
