import type { Element } from "hast";
import { z } from "zod";
import { slotElement } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

function paragraphsOf(element: Element): Element[] {
  return element.children.filter(
    (child): child is Element => child.type === "element" && child.tagName === "p"
  );
}

function buildInfoLines(paragraphs: Element[]): Element[] {
  const lines: Element[] = [];
  const [title, desc] = paragraphs;
  if (title) lines.push(slotElement("title", title.children));
  if (desc) lines.push(slotElement("desc", desc.children));
  return lines;
}

function decorateIconCard(element: Element): void {
  const paragraphs = paragraphsOf(element);
  const iconCell = slotElement("icon", []);
  const infoCell = slotElement("info", buildInfoLines(paragraphs));
  element.children = [iconCell, infoCell];
}

const LARGE_STYLE = {
  root: {
    display: "table",
    width: "100%",
    border: "1px solid var(--color-border)",
    "border-radius": "6px",
    padding: "12px 16px",
  },
  icon: {
    display: "table-cell",
    width: "48px",
    height: "48px",
    "background-color": "var(--color-surface-alt)",
    "border-radius": "8px",
    "vertical-align": "middle",
  },
  info: {
    display: "table-cell",
    "vertical-align": "middle",
    "padding-left": "12px",
  },
  title: { "font-weight": "700" },
  desc: {
    color: "var(--color-text-secondary)",
    "font-size": "var(--font-size-sm)",
    "margin-top": "2px",
  },
} as const;

const COMPACT_STYLE = {
  root: {
    display: "table",
    width: "100%",
    border: "1px solid var(--color-border)",
    "border-radius": "6px",
    padding: "6px 8px",
  },
  icon: {
    display: "table-cell",
    width: "32px",
    height: "32px",
    "background-color": "var(--color-surface-alt)",
    "border-radius": "6px",
    "vertical-align": "middle",
  },
  info: {
    display: "table-cell",
    "vertical-align": "middle",
    "padding-left": "8px",
  },
  title: { "font-weight": "700", "font-size": "var(--font-size-sm)" },
  desc: {
    color: "var(--color-text-secondary)",
    "font-size": "12px",
    "margin-top": "1px",
  },
} as const;

export const miniprogramCard = defineBlock(
  "miniprogram-card",
  "小程序卡片",
  z.object({}).strict(),
  "marketing",
  [
    { id: "default", label: "标准小程序卡片" },
    { id: "large", label: "大图小程序卡片", baseStyle: LARGE_STYLE },
    { id: "compact", label: "紧凑小程序卡片", baseStyle: COMPACT_STYLE },
  ],
  {
    slots: ["root", "icon", "info", "title", "desc"],
    directiveBody:
      "large/compact 变体正文首段为标题，可另起一段作为描述；渲染为左图标占位 + 右标题/描述并排卡片。",
    decorate: (element, ctx) => {
      if (ctx.variant === "large" || ctx.variant === "compact") decorateIconCard(element);
    },
  }
);
