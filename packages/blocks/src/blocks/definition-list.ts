import type { Element } from "hast";
import { z } from "zod";
import { slotElement } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

function findList(element: Element): Element | undefined {
  return element.children.find(
    (child): child is Element => child.type === "element" && child.tagName === "ul"
  );
}

function listItemsOf(ul: Element): Element[] {
  return ul.children.filter(
    (child): child is Element => child.type === "element" && child.tagName === "li"
  );
}

function textContentOf(children: Element["children"]): string {
  return children
    .map((child) => {
      if (child.type === "text") return child.value;
      if (child.type === "element") return textContentOf(child.children);
      return "";
    })
    .join("");
}

function splitEntry(li: Element): { term: string; rest: Element["children"] } {
  const paragraph = li.children.find(
    (child): child is Element => child.type === "element" && child.tagName === "p"
  );
  const paragraphChildren = paragraph?.children ?? li.children;
  const strongIdx = paragraphChildren.findIndex(
    (child): child is Element => child.type === "element" && child.tagName === "strong"
  );
  if (strongIdx === -1) {
    return { term: textContentOf(paragraphChildren), rest: [] };
  }
  const strong = paragraphChildren[strongIdx] as Element;
  return { term: textContentOf(strong.children), rest: paragraphChildren.slice(strongIdx + 1) };
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

function buildCardEntries(ul: Element): Element[] {
  return listItemsOf(ul).map((li) => {
    const { term, rest } = splitEntry(li);
    const definition = textContentOf(rest).replace(/^[：:，,\s]+/, "");
    const cardChildren: Element[] = [slotElement("term", [{ type: "text", value: term }])];
    if (definition.length > 0) {
      cardChildren.push(slotElement("definition", [{ type: "text", value: definition }]));
    }
    return slotElement("card-cell", cardChildren);
  });
}

export const definitionList = defineBlock(
  "definition-list",
  "定义列表",
  z.object({}).strict(),
  "text",
  [
    { id: "default", label: "标准定义列表" },
    {
      id: "two-column",
      label: "双列定义列表",
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
      label: "卡片式定义列表",
      baseStyle: {
        root: { display: "block" },
        "card-cell": {
          display: "block",
          border: "1px solid var(--color-border)",
          "border-radius": "4px",
          padding: "10px 12px",
          "margin-bottom": "8px",
          "box-sizing": "border-box",
        },
        term: {
          color: "var(--color-text-muted)",
          "font-weight": "600",
          "font-size": "13px",
          "margin-bottom": "4px",
        },
        definition: {
          color: "var(--color-text-secondary)",
        },
      },
    },
  ],
  {
    baseStyle: {
      root: {
        margin: "16px 0",
        padding: "0",
        "border-top": "1px solid #e8e8e8",
      },
    },
    slots: ["root", "grid-row", "grid-cell", "card-cell", "term", "definition"],
    directiveBody: "正文写为 Markdown 无序列表，每项以「**术语**：定义」形式书写一个条目。",
    decorate: (element, ctx) => {
      const ul = findList(element);
      if (!ul) return;
      if (ctx.variant === "two-column") {
        element.children = buildTwoColumnRows(ul);
        return;
      }
      if (ctx.variant === "card-style") {
        element.children = buildCardEntries(ul);
      }
    },
  }
);
