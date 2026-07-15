import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const authorCard = defineBlock(
  "author-card",
  "作者卡片",
  z.object({}).strict(),
  "meta",
  [
    { id: "default", label: "横排作者" },
    {
      id: "centered",
      label: "居中作者",
      baseStyle: {
        root: {
          "text-align": "center",
        },
      },
    },
    {
      id: "minimal",
      label: "简约作者",
      baseStyle: {
        root: {
          "background-color": "transparent",
          "border-radius": "0",
        },
      },
    },
  ],
  {
    baseStyle: {
      root: {
        display: "table",
        padding: "16px",
        margin: "16px 0",
        "border-radius": "8px",
        "background-color": "#f9f9f9",
      },
    },
  }
);
