import type { Element } from "hast";
import { z } from "zod";
import { slotElement } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

const BANNER_CTA_LABEL = "订阅更新";

function decorateBanner(element: Element): void {
  const markedChildren = element.children.map((child) => {
    if (child.type !== "element") return child;
    return {
      ...child,
      properties: { ...(child.properties ?? {}), "data-block-slot": "title" },
    } as Element;
  });
  const button = slotElement("button", [{ type: "text", value: BANNER_CTA_LABEL }]);
  element.children = [...markedChildren, button];
}

export const subscribeCta = defineBlock(
  "subscribe-cta",
  "订阅引导",
  z.object({}).strict(),
  "marketing",
  [
    { id: "default", label: "标准订阅引导" },
    {
      id: "banner",
      label: "横幅订阅引导",
      baseStyle: {
        root: {
          "background-color": "var(--color-surface-alt)",
          border: "none",
          padding: "28px 16px",
        },
        title: {
          "font-weight": "700",
          "font-size": "18px",
          "margin-bottom": "12px",
        },
        button: {
          display: "inline-block",
          background: "var(--color-brand)",
          color: "var(--color-text-inverse)",
          "font-weight": "700",
          padding: "8px 24px",
          "border-radius": "999px",
        },
      },
    },
  ],
  {
    baseStyle: {
      root: {
        "text-align": "center",
        padding: "24px 16px",
        margin: "24px 0",
        "border-radius": "8px",
        "background-color": "#f5f0ff",
        border: "1px solid #d6b4fc",
      },
    },
    slots: ["root", "title", "button"],
    decorate: (element, ctx) => {
      if (ctx.variant === "banner") decorateBanner(element);
    },
  }
);
