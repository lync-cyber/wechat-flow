import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const readingTime = defineBlock(
  "reading-time",
  "阅读时长",
  z.object({}).strict(),
  "meta",
  [
    { id: "default", label: "标准阅读时长" },
    {
      id: "inline",
      label: "行内阅读时长",
      baseStyle: {
        root: {
          display: "inline",
          "background-color": "transparent",
          "border-radius": "0",
          padding: "0",
          margin: "0",
        },
      },
    },
  ],
  {
    baseStyle: {
      root: {
        display: "inline-block",
        padding: "4px 10px",
        "border-radius": "12px",
        "font-size": "0.8em",
        color: "#666",
        "background-color": "#f0f0f0",
        margin: "8px 0",
      },
    },
  }
);
