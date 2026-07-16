import type { Element } from "hast";
import { z } from "zod";
import { findList, listItemsOf, slotElement } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

function buildGridRows(ul: Element): Element[] {
  const items = listItemsOf(ul);
  const rows: Element[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const cells = items.slice(i, i + 2).map((li) => slotElement("grid-cell", [...li.children]));
    rows.push(slotElement("grid-row", cells));
  }
  return rows;
}

export const relatedCards = defineBlock(
  "related-cards",
  "相关文章",
  z.object({}).strict(),
  "marketing",
  [
    { id: "default", label: "标准相关文章" },
    {
      id: "compact",
      label: "紧凑相关文章",
      baseStyle: {
        root: {
          padding: "8px 10px",
          margin: "12px 0",
        },
      },
    },
    {
      id: "grid",
      label: "网格相关文章",
      baseStyle: {
        root: {
          display: "table",
          width: "100%",
          "border-collapse": "separate",
          "border-spacing": "8px",
        },
        "grid-row": { display: "table-row" },
        "grid-cell": {
          display: "table-cell",
          width: "50%",
          "vertical-align": "top",
          "box-sizing": "border-box",
          padding: "10px 12px",
          border: "1px solid var(--color-border)",
          "border-radius": "4px",
        },
      },
    },
  ],
  {
    baseStyle: {
      root: {
        margin: "24px 0",
        padding: "16px",
        "border-radius": "8px",
        "background-color": "#f9f9f9",
        "border-top": "2px solid #e0e0e0",
      },
    },
    slots: ["root", "grid-row", "grid-cell"],
    directiveBody:
      "default/compact 变体正文可为自由文本；grid 变体正文写为 Markdown 无序列表，每项为一篇相关文章链接。",
    decorate: (element, ctx) => {
      if (ctx.variant !== "grid") return;
      const ul = findList(element);
      if (!ul) return;
      element.children = buildGridRows(ul);
    },
  }
);
