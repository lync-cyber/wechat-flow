import type { Element } from "hast";
import { z } from "zod";
import { slotElement } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

const ICON_LEFT_GLYPH = "◆";

function decorateIconLeft(element: Element): void {
  const icon = slotElement("icon", [{ type: "text", value: ICON_LEFT_GLYPH }]);
  const label = slotElement("label", element.children);
  element.children = [icon, label];
}

export const socialCta = defineBlock(
  "social-cta",
  "社交行动引导",
  z.object({}).strict(),
  "marketing",
  [
    { id: "default", label: "标准社交引导" },
    {
      id: "icon-left",
      label: "图标左置引导",
      baseStyle: {
        root: {
          "border-radius": "24px",
          padding: "10px 16px",
        },
        icon: {
          display: "table-cell",
          "vertical-align": "middle",
          width: "26px",
          "text-align": "center",
          "border-radius": "50%",
          background: "var(--color-brand)",
          color: "var(--color-text-inverse)",
          "font-size": "12px",
        },
        label: {
          display: "table-cell",
          "vertical-align": "middle",
          color: "var(--color-text-muted)",
          "font-size": "13px",
          "line-height": "1.5",
          "padding-left": "10px",
        },
      },
    },
    {
      id: "full-width",
      label: "全宽社交引导",
      baseStyle: {
        root: {
          "border-radius": "0",
          border: "none",
        },
      },
    },
  ],
  {
    baseStyle: {
      root: {
        display: "table",
        width: "100%",
        padding: "14px 16px",
        margin: "16px 0",
        "border-radius": "8px",
        "background-color": "#f0faf0",
        border: "1px solid #b2ddb2",
      },
    },
    slots: ["root", "icon", "label"],
    decorate: (element, ctx) => {
      if (ctx.variant === "icon-left") decorateIconLeft(element);
    },
  }
);
