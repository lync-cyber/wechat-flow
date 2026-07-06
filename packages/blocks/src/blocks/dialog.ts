import { z } from "zod";
import { defineBlock } from "../factory.ts";

const CHAT_BUBBLE_SHARED_STYLE = {
  "border-radius": "12px",
  "max-width": "80%",
  padding: "10px 14px",
  display: "inline-block",
};

export const dialog = defineBlock(
  "dialog",
  "对话",
  z.object({
    speaker: z.string(),
    text: z.string(),
    avatar: z.string().optional(),
  }),
  "structured",
  [
    { id: "default", label: "标准对话" },
    {
      id: "chat-bubbles",
      label: "聊天气泡",
      baseStyle: {
        root: {
          display: "table",
          "margin-bottom": "8px",
        },
        "bubble-left": {
          ...CHAT_BUBBLE_SHARED_STYLE,
          "margin-right": "auto",
          background: "#F3F0EB",
          color: "#1C1917",
        },
        "bubble-right": {
          ...CHAT_BUBBLE_SHARED_STYLE,
          "margin-left": "auto",
          background: "#2D5A4E",
          color: "#FAFAF9",
        },
      },
    },
    { id: "interview", label: "访谈对话" },
  ],
  undefined,
  ["root", "bubble-left", "bubble-right"]
);
