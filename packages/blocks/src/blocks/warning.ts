import { z } from "zod";
import { injectLeadingInlineNode, slotElement } from "../decorate-utils.ts";
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
    {
      id: "banner",
      label: "横幅警告",
      baseStyle: {
        root: {
          "border-top": "6px solid var(--color-accent)",
          "border-radius": "0",
          "background-color": "var(--color-surface-alt)",
          padding: "18px 16px 12px",
        },
        badge: {
          "background-color": "var(--color-accent)",
          color: "var(--color-text-inverse)",
          padding: "4px 10px",
          "font-size": "11px",
          "font-weight": "700",
          "letter-spacing": "0.15em",
          "text-align": "right",
          "text-transform": "uppercase",
          margin: "0 0 8px",
        },
      },
    },
    {
      id: "inline",
      label: "行内警告",
      baseStyle: {
        root: {
          "border-left": "none",
          "border-radius": "0",
          "background-color": "transparent",
          padding: "0",
          margin: "0",
          "font-size": "13px",
        },
        icon: {
          color: "var(--color-accent)",
          "margin-right": "4px",
        },
      },
    },
  ],
  {
    baseStyle: {
      root: {
        padding: "12px 16px",
        margin: "16px 0",
      },
    },
    slots: ["root", "badge", "icon"],
    decorate: (element, ctx) => {
      if (ctx.variant === "banner") {
        const badge = slotElement("badge", [{ type: "text", value: "警告" }]);
        element.children = [badge, ...element.children];
        return;
      }
      if (ctx.variant === "inline") {
        const icon = slotElement("icon", [{ type: "text", value: "⚠" }], { inline: true });
        injectLeadingInlineNode(element, icon);
        return;
      }
    },
  }
);
