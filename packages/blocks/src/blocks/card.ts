import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const card = defineBlock(
  "card",
  "卡片",
  z.object({}).strict(),
  "structured",
  [
    { id: "default", label: "普通卡片" },
    {
      id: "elevated",
      label: "阴影卡片",
      baseStyle: {
        root: {
          border: "none",
          "border-top": "3px solid var(--color-brand)",
          "background-color": "var(--color-background)",
          "box-shadow": "0 2px 10px rgba(0,0,0,0.06)",
        },
      },
    },
    {
      id: "outlined",
      label: "描边卡片",
      baseStyle: {
        root: {
          border: "1px solid var(--color-border-strong)",
          "border-radius": "0",
          "background-color": "transparent",
        },
      },
    },
    { id: "horizontal", label: "横排卡片" },
    {
      id: "minimal",
      label: "简约卡片",
      baseStyle: {
        root: {
          border: "none",
          "border-radius": "0",
        },
      },
    },
  ],
  {
    baseStyle: {
      root: {
        border: "1px solid #e0e0e0",
        "border-radius": "8px",
        padding: "16px",
        margin: "12px 0",
      },
    },
  }
);
