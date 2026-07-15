import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const warning = defineBlock(
  "warning",
  "警告块",
  z.object({}).strict(),
  "emphasis",
  [
    {
      id: "default",
      label: "标准警告",
      baseStyle: {
        root: {
          "border-left": "4px solid #e53e3e",
          "border-radius": "4px",
          "background-color": "#fff5f5",
        },
      },
    },
    { id: "banner", label: "横幅警告" },
    { id: "inline", label: "行内警告" },
  ],
  {
    root: {
      padding: "12px 16px",
      margin: "16px 0",
    },
  }
);
