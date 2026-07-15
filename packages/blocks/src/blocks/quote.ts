import { z } from "zod";
import { injectDropcapMutation, injectLeadingInlineNode, slotElement } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

export const quote = defineBlock(
  "quote",
  "引用",
  z.object({}).strict(),
  "text",
  [
    {
      id: "default",
      label: "标准引用",
      baseStyle: {
        root: {
          "border-left": "3px solid #888",
        },
      },
    },
    {
      id: "bordered",
      label: "边框引用",
      baseStyle: {
        root: {
          border: "1px solid var(--color-border-strong)",
        },
        byline: {
          "border-top": "1px solid var(--color-border)",
          "margin-top": "10px",
          "padding-top": "6px",
          "text-align": "right",
          color: "var(--color-text-muted)",
          "font-size": "12px",
        },
      },
    },
    {
      id: "centered",
      label: "居中引用",
      baseStyle: {
        root: {
          "text-align": "center",
        },
        "quote-mark": {
          display: "inline-block",
          "font-size": "28px",
          "line-height": "0.6",
          opacity: "0.35",
          color: "var(--color-brand)",
          "vertical-align": "top",
          "margin-right": "4px",
        },
      },
    },
    {
      id: "filled",
      label: "填充引用",
      baseStyle: {
        root: {
          background: "var(--color-surface-alt)",
          "border-left": "6px solid var(--color-accent)",
        },
      },
    },
    {
      id: "minimal",
      label: "简约引用",
      baseStyle: {
        root: {
          color: "var(--color-text-secondary)",
        },
      },
    },
    { id: "large", label: "大字引用" },
    {
      id: "italic",
      label: "斜体引用",
      baseStyle: {
        root: {
          "font-style": "italic",
        },
      },
    },
    {
      id: "card",
      label: "卡片引用",
      baseStyle: {
        root: {
          border: "1px solid var(--color-border)",
          "box-shadow": "0 2px 8px rgba(28,25,23,0.12)",
          background: "var(--color-background)",
        },
        "quote-mark": {
          display: "inline-block",
          "font-size": "20px",
          "line-height": "0.6",
          opacity: "0.3",
          color: "var(--color-brand)",
          "vertical-align": "top",
          "margin-right": "4px",
        },
      },
    },
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
    baseStyle: {
      root: {
        padding: "8px 16px",
        margin: "16px 0",
        color: "#555",
      },
    },
    slots: ["root", "quote-mark", "dropcap", "dropcap-table", "byline"],
    decorate: (element, ctx) => {
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
      if (ctx.variant === "bordered") {
        const byline = slotElement("byline", [{ type: "text", value: "——" }]);
        element.children = [...element.children, byline];
        return;
      }
      if (ctx.variant === "centered") {
        const mark = slotElement("quote-mark", [{ type: "text", value: "“" }], { inline: true });
        injectLeadingInlineNode(element, mark);
        return;
      }
      if (ctx.variant === "card") {
        const mark = slotElement("quote-mark", [{ type: "text", value: "❝" }], { inline: true });
        injectLeadingInlineNode(element, mark);
        return;
      }
    },
  }
);
