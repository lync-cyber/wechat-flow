import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const announcement = defineBlock(
  "announcement",
  "公告",
  z.object({}).strict(),
  "emphasis",
  [
    {
      id: "danger-bar",
      label: "危险横幅公告",
      baseStyle: {
        root: {
          "border-top": "4px solid #b94a3e",
          "border-left": "3px solid #b94a3e",
          padding: "12px 16px",
          background: "#f3f0eb",
        },
      },
    },
    {
      id: "compact",
      label: "紧凑公告",
      baseStyle: {
        root: {
          padding: "8px 12px",
          "border-left": "3px solid #2d5a4e",
          "font-size": "13px",
        },
      },
    },
  ],
  {
    root: {
      "border-left": "3px solid #b94a3e",
      padding: "12px 16px",
      background: "#f3f0eb",
    },
  }
);
