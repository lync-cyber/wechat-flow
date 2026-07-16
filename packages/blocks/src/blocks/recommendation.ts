import type { Element } from "hast";
import { z } from "zod";
import { findList, listItemsOf, slotElement } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

function buildItemLine(li: Element): Element {
  return slotElement("item", [{ type: "text", value: "• " }, ...li.children]);
}

function decorateCard(element: Element): void {
  const listEl = findList(element);
  const newChildren: Element[] = [];
  for (const child of element.children) {
    if (child.type !== "element") continue;
    if (child === listEl) {
      newChildren.push(slotElement("list", listItemsOf(child).map(buildItemLine)));
    } else {
      newChildren.push(slotElement("title", child.children));
    }
  }
  element.children = newChildren;
}

const CARD_STYLE = {
  root: {
    border: "1px solid var(--color-border)",
    "border-radius": "6px",
    padding: "16px",
    margin: "16px 0",
  },
  title: { "font-weight": "700", "margin-bottom": "8px" },
  list: { margin: "0", "padding-left": "18px" },
  item: { color: "var(--color-brand)", "margin-bottom": "4px" },
} as const;

const COMPACT_STYLE = {
  root: {
    border: "1px solid var(--color-border)",
    "border-radius": "6px",
    padding: "8px 10px",
    margin: "8px 0",
  },
  title: { "font-weight": "700", "margin-bottom": "4px", "font-size": "var(--font-size-sm)" },
  list: { margin: "0", "padding-left": "14px" },
  item: {
    color: "var(--color-brand)",
    "margin-bottom": "2px",
    "font-size": "var(--font-size-sm)",
  },
} as const;

export const recommendation = defineBlock(
  "recommendation",
  "推荐阅读",
  z.object({}).strict(),
  "marketing",
  [
    { id: "default", label: "列表推荐" },
    { id: "card", label: "卡片推荐", baseStyle: CARD_STYLE },
    { id: "compact", label: "紧凑推荐", baseStyle: COMPACT_STYLE },
  ],
  {
    slots: ["root", "title", "list", "item"],
    directiveBody: "card/compact 变体正文首段为标题，随后可写 Markdown 无序链接列表作为推荐项。",
    decorate: (element, ctx) => {
      if (ctx.variant === "card" || ctx.variant === "compact") decorateCard(element);
    },
  }
);
