import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const dialog = defineBlock(
  "dialog",
  "对话",
  z.object({
    speaker: z.string(),
    text: z.string(),
    avatar: z.string().optional(),
  }),
  [
    { id: "default", label: "标准对话" },
    { id: "bubble", label: "气泡对话" },
    { id: "interview", label: "访谈对话" },
  ]
);
