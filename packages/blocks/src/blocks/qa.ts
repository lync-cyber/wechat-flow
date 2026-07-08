import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const qa = defineBlock(
  "qa",
  "问答",
  z.object({}).strict(),
  "structured",
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
  },
  undefined,
  "正文按一问一答顺序书写，每组问答以「**问：**」开头的段落紧跟「**答：**」开头的段落表达。"
);
