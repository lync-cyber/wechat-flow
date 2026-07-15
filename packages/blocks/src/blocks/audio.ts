import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const audio = defineBlock("audio", "音频", z.object({}).strict(), "media", [
  { id: "default", label: "标准音频" },
]);
