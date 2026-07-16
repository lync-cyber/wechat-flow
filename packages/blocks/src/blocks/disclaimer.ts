import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const disclaimer = defineBlock(
  "disclaimer",
  "免责声明",
  z.object({}).strict(),
  "emphasis",
  [
    { id: "default", label: "标准免责声明" },
    {
      id: "compact",
      label: "紧凑免责声明",
      baseStyle: {
        root: {
          "background-color": "transparent",
          border: "1px solid var(--color-border-strong)",
          "border-radius": "0",
          padding: "8px 12px",
          "font-size": "0.6875em",
          "text-transform": "uppercase",
          "letter-spacing": "0.08em",
        },
      },
    },
    {
      id: "bordered",
      label: "边框免责声明",
      baseStyle: {
        root: {
          "background-color": "transparent",
          border: "1px solid var(--color-border-strong)",
          "border-radius": "0",
          "font-size": "0.8125em",
          "text-transform": "uppercase",
          "letter-spacing": "0.12em",
        },
      },
    },
  ],
  {
    baseStyle: {
      root: {
        padding: "12px 16px",
        margin: "16px 0",
        "border-radius": "4px",
        "background-color": "#f7f7f7",
        "font-size": "0.875em",
        color: "#888",
      },
    },
  }
);
