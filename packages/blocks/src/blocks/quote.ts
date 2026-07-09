import { z } from "zod";
import { injectDropcapMutation, injectLeadingInlineNode, slotElement } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

export const quote = defineBlock(
  "quote",
  "引用",
  z.object({}).strict(),
  "text",
  [
    { id: "default", label: "标准引用" },
    { id: "bordered", label: "边框引用" },
    { id: "centered", label: "居中引用" },
    { id: "filled", label: "填充引用" },
    { id: "minimal", label: "简约引用" },
    { id: "large", label: "大字引用" },
    { id: "italic", label: "斜体引用" },
    { id: "card", label: "卡片引用" },
    {
      id: "large-quote-mark",
      label: "大引号引用",
      baseStyle: {
        root: {
          padding: "8px 16px",
          margin: "16px 0",
          color: "#555",
        },
        "quote-mark": {
          "font-size": "2em",
          color: "var(--color-brand)",
          opacity: "0.4",
          "line-height": "0.6",
          display: "inline-block",
          "vertical-align": "top",
          "margin-right": "4px",
        },
      },
    },
    {
      id: "dropcap",
      label: "首字下沉引用",
      baseStyle: {
        root: {
          padding: "8px 16px",
          margin: "16px 0",
          color: "#555",
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
  {
    root: {
      "border-left": "3px solid #888",
      padding: "8px 16px",
      margin: "16px 0",
      color: "#555",
    },
  },
  ["root", "quote-mark", "dropcap", "dropcap-table"],
  undefined,
  (element, ctx) => {
    if (ctx.variant === "large-quote-mark") {
      const { "data-quote-decoration": _stash, ...restProps } = element.properties ?? {};
      element.properties = restProps;
      injectLeadingInlineNode(
        element,
        slotElement("quote-mark", [{ type: "text", value: '"' }], { inline: true })
      );
      return;
    }
    if (ctx.variant === "dropcap") {
      const { "data-quote-decoration": _stash, ...restProps } = element.properties ?? {};
      element.properties = restProps;
      injectDropcapMutation(element);
    }
  }
);
