import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const callout = defineBlock(
  "callout",
  "提示框",
  z.object({}).strict(),
  "emphasis",
  [
    {
      id: "tip",
      label: "小技巧提示",
      baseStyle: {
        root: {
          padding: "12px 16px",
          margin: "16px 0",
          "border-radius": "8px 0 8px 8px",
          "box-shadow": "inset -4px 0 0 0 #2D5A4E",
          background: "#F3F0EB",
        },
      },
    },
    {
      id: "warning",
      label: "警告提示",
      baseStyle: {
        root: {
          padding: "12px 16px",
          margin: "16px 0",
          "border-top": "2px dashed #B94A3E",
          "border-bottom": "2px solid #B94A3E",
          background: "transparent",
        },
      },
    },
    {
      id: "info",
      label: "信息提示",
      baseStyle: {
        root: {
          padding: "12px 16px",
          margin: "16px 0",
          border: "1px solid #2D5A4E",
          "box-shadow": "inset 0 2px 0 0 #2D5A4E, 0 1px 3px rgba(0,0,0,0.06)",
          background: "#FAF8F5",
        },
      },
    },
    {
      id: "danger",
      label: "危险提示",
      baseStyle: {
        root: {
          padding: "12px 16px",
          margin: "16px 0",
          "border-top": "8px solid #B94A3E",
          "border-radius": "0",
          background: "#F3F0EB",
        },
      },
    },
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
