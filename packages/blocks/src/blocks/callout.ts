import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const callout = defineBlock(
  "callout",
  "提示框",
  z.object({
    type: z.enum(["info", "warning", "success", "error"]).default("info"),
    text: z.string(),
    title: z.string().optional(),
  }),
  [
    { id: "default", label: "默认提示" },
    { id: "filled", label: "填充提示" },
    { id: "minimal", label: "简约提示" },
    { id: "info", label: "信息提示" },
    { id: "success", label: "成功提示" },
    { id: "warning", label: "警告提示" },
    { id: "error", label: "错误提示" },
    { id: "tip", label: "小技巧提示" },
    { id: "note", label: "注意提示" },
    { id: "important", label: "重要提示" },
  ],
  {
    root: {
      "border-left": "4px solid #4a90e2",
      padding: "12px 16px",
      "border-radius": "4px",
      margin: "16px 0",
      "background-color": "#f0f7ff",
    },
  }
);
