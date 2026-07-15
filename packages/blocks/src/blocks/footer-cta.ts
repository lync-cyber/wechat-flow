import type { Element } from "hast";
import { z } from "zod";
import { slotElement } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

const CTA_BUTTON_LABEL = "关注我";
const ACTION_LABELS: readonly [string, string, string] = ["♡ 赞同", "★ 收藏", "↗ 转发"];

function buildCtaButton(): Element {
  return slotElement("button", [{ type: "text", value: CTA_BUTTON_LABEL }], { inline: true });
}

function buildActionRow(): Element {
  const [like, star, share] = ACTION_LABELS;
  return slotElement("action-row", [
    slotElement("action-side", [{ type: "text", value: like }]),
    slotElement("action-center", [{ type: "text", value: star }]),
    slotElement("action-side", [{ type: "text", value: share }]),
  ]);
}

export const footerCta = defineBlock(
  "footer-cta",
  "底部行动号召",
  z.object({}).strict(),
  "marketing",
  [
    { id: "default", label: "标准 CTA" },
    {
      id: "centered",
      label: "居中 CTA",
      baseStyle: {
        root: {
          "text-align": "center",
          padding: "24px 16px",
          margin: "24px 0",
        },
        button: {
          display: "inline-block",
          "margin-top": "12px",
          padding: "10px 28px",
          "border-radius": "24px",
          "background-color": "var(--color-brand)",
          color: "var(--color-text-inverse)",
          "font-weight": "700",
        },
      },
    },
    {
      id: "full-width",
      label: "全宽 CTA",
      baseStyle: {
        root: {
          padding: "16px",
          margin: "16px 0",
        },
        "action-row": {
          display: "table",
          width: "100%",
          "table-layout": "fixed",
        },
        "action-side": {
          display: "table-cell",
          "text-align": "center",
          padding: "10px 6px",
          border: "1px solid var(--color-border-strong)",
          color: "var(--color-text-primary)",
        },
        "action-center": {
          display: "table-cell",
          "text-align": "center",
          padding: "10px 6px",
          border: "1px solid var(--color-border-strong)",
          "background-color": "var(--color-brand)",
          color: "var(--color-text-inverse)",
          "font-weight": "700",
        },
      },
    },
  ],
  {
    slots: ["root", "button", "action-row", "action-side", "action-center"],
    directiveBody:
      "centered 变体末尾渲染主色胶囊按钮；full-width 变体正文下方追加赞同/收藏/转发三栏动作条。",
    decorate: (element, ctx) => {
      if (ctx.variant === "centered") {
        element.children = [...element.children, buildCtaButton()];
        return;
      }
      if (ctx.variant === "full-width") {
        element.children = [...element.children, buildActionRow()];
        return;
      }
    },
  }
);
