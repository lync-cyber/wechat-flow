import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const qa = defineBlock(
  "qa",
  "问答",
  z.object({
    question: z.string(),
    answer: z.string(),
    questionPrefix: z.string().optional(),
    answerPrefix: z.string().optional(),
  }),
  [
    { id: "default", label: "标准问答" },
    { id: "bubble", label: "气泡问答" },
    { id: "bold-q", label: "粗体问题" },
  ],
  {
    root: {
      margin: "16px 0",
      padding: "0",
    },
  }
);
