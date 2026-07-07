import { z } from "zod";
import { defineBlock } from "../factory.ts";

export const paragraph = defineBlock(
  "paragraph",
  "段落",
  z.object({
    text: z.string(),
    indent: z.boolean().optional(),
  }),
  "text",
  [
    { id: "default", label: "普通段落" },
    { id: "indented", label: "首行缩进" },
    { id: "spaced", label: "宽松行距" },
    {
      id: "dropcap",
      label: "段首大号字符",
      baseStyle: {
        dropcap: {
          "font-size": "2.2em",
          "font-weight": "700",
          color: "#2D5A4E",
          display: "inline-block",
          "vertical-align": "top",
          "margin-right": "4px",
          "font-family":
            "'LXGW WenKai', 'Source Han Serif CN', 'Noto Serif CJK SC', Georgia, serif",
        },
      },
    },
  ],
  undefined,
  ["root", "dropcap"]
);
