import type { Element } from "hast";
import { z } from "zod";
import { defineBlock } from "../factory.ts";

function findFirstParagraph(element: Element): Element | undefined {
  return element.children.find(
    (child): child is Element => child.type === "element" && child.tagName === "p"
  );
}

export const kpiCard = defineBlock(
  "kpi-card",
  "数据指标卡",
  z.object({}).strict(),
  "structured",
  [
    { id: "default", label: "标准指标卡" },
    {
      id: "highlight",
      label: "强调指标卡",
      baseStyle: {
        root: {
          "border-top": "3px solid var(--color-brand)",
        },
        value: {
          "font-size": "32px",
          "font-weight": "700",
          "line-height": "1",
          color: "var(--color-text-primary)",
        },
      },
    },
    {
      id: "compact",
      label: "紧凑指标卡",
      baseStyle: {
        root: {
          padding: "10px 8px",
        },
      },
    },
  ],
  {
    baseStyle: {
      root: {
        "text-align": "center",
        padding: "20px 16px",
        margin: "12px 0",
        "border-radius": "8px",
        border: "1px solid #e8e8e8",
        "background-color": "#ffffff",
      },
    },
    slots: ["root", "value"],
    decorate: (element, ctx) => {
      if (ctx.variant !== "highlight") return;
      const paragraph = findFirstParagraph(element);
      if (!paragraph) return;
      paragraph.properties = { ...(paragraph.properties ?? {}), "data-block-slot": "value" };
    },
  }
);
