import { z } from "zod";
import { injectDropcapMutation } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

export const paragraph = defineBlock(
  "paragraph",
  "段落",
  z.object({}).strict(),
  "text",
  [
    { id: "default", label: "普通段落" },
    { id: "indented", label: "首行缩进" },
    { id: "spaced", label: "宽松行距" },
    {
      id: "dropcap",
      label: "段首大号字符",
      baseStyle: {
        root: {
          margin: "16px 0",
        },
        dropcap: {
          display: "table-cell",
          width: "1%",
          "white-space": "nowrap",
          "vertical-align": "top",
          "padding-right": "8px",
          "font-size": "2.2em",
          "font-weight": "700",
          "line-height": "1",
          color: "var(--color-brand)",
        },
        "dropcap-table": {
          display: "table",
          width: "100%",
        },
      },
    },
  ],
  undefined,
  ["root", "dropcap", "dropcap-table"],
  undefined,
  (element, ctx) => {
    if (ctx.variant !== "dropcap") return;
    const { "data-paragraph-decoration": _stash, ...restProps } = element.properties ?? {};
    element.properties = restProps;
    injectDropcapMutation(element);
  }
);
