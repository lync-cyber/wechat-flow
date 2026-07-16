import type { Element } from "hast";
import { z } from "zod";
import { findList, listItemsOf, slotElement, textContentOf } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

function splitItem(li: Element): { title: string; rest: Element["children"] } {
  const paragraph = li.children.find(
    (child): child is Element => child.type === "element" && child.tagName === "p"
  );
  const paragraphChildren = paragraph?.children ?? li.children;
  const strongIdx = paragraphChildren.findIndex(
    (child): child is Element => child.type === "element" && child.tagName === "strong"
  );
  if (strongIdx === -1) {
    return { title: textContentOf(paragraphChildren), rest: [] };
  }
  const strong = paragraphChildren[strongIdx] as Element;
  return { title: textContentOf(strong.children), rest: paragraphChildren.slice(strongIdx + 1) };
}

function buildTwoColumnRows(ul: Element): Element[] {
  const items = listItemsOf(ul);
  const rows: Element[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const cells = items.slice(i, i + 2).map((li) => slotElement("grid-cell", [...li.children]));
    rows.push(slotElement("grid-row", cells));
  }
  return rows;
}

function buildCardCells(ul: Element): Element[] {
  return listItemsOf(ul).map((li) => {
    const { title, rest } = splitItem(li);
    const description = textContentOf(rest).replace(/^[：:，,\s]+/, "");
    const cardChildren: Element[] = [slotElement("card-title", [{ type: "text", value: title }])];
    if (description.length > 0) {
      cardChildren.push(slotElement("card-body", [{ type: "text", value: description }]));
    }
    return slotElement("card-cell", cardChildren);
  });
}

export const tipGrid = defineBlock(
  "tip-grid",
  "提示网格",
  z.object({}).strict(),
  "emphasis",
  [
    { id: "default", label: "标准提示网格" },
    {
      id: "two-column",
      label: "双列提示网格",
      baseStyle: {
        root: { "table-layout": "fixed" },
        "grid-row": { display: "table-row" },
        "grid-cell": {
          display: "table-cell",
          width: "50%",
          "vertical-align": "top",
          "box-sizing": "border-box",
          padding: "8px",
        },
      },
    },
    {
      id: "card-style",
      label: "卡片式提示网格",
      baseStyle: {
        root: { display: "block", "border-spacing": "0" },
        "card-cell": {
          display: "block",
          border: "1px solid var(--color-border)",
          "border-radius": "4px",
          padding: "10px 12px",
          "margin-bottom": "8px",
          "box-sizing": "border-box",
        },
        "card-title": {
          color: "var(--color-text-muted)",
          "font-weight": "600",
          "font-size": "13px",
          "margin-bottom": "4px",
        },
        "card-body": {
          color: "var(--color-text-secondary)",
        },
      },
    },
  ],
  {
    baseStyle: {
      root: {
        display: "table",
        width: "100%",
        margin: "16px 0",
        "border-collapse": "separate",
        "border-spacing": "8px",
      },
    },
    slots: ["root", "grid-row", "grid-cell", "card-cell", "card-title", "card-body"],
    directiveBody: "正文写为 Markdown 无序列表，每项以「**标题**：说明」形式书写一条提示。",
    decorate: (element, ctx) => {
      const ul = findList(element);
      if (!ul) return;
      if (ctx.variant === "two-column") {
        element.children = buildTwoColumnRows(ul);
        return;
      }
      if (ctx.variant === "card-style") {
        element.children = buildCardCells(ul);
      }
    },
  }
);
