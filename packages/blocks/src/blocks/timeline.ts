import type { Element } from "hast";
import { z } from "zod";
import { findList, listItemsOf, slotElement } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

function buildTimelineRow(ul: Element): Element {
  const cells = listItemsOf(ul).map((li) => slotElement("time-cell", [...li.children]));
  return slotElement("time-row", cells);
}

export const timeline = defineBlock(
  "timeline",
  "时间线",
  z.object({}).strict(),
  "structured",
  [
    {
      id: "default",
      label: "竖向时间线",
      baseStyle: {
        root: {
          "border-left": "2px solid var(--color-border-strong)",
          padding: "0 0 4px 16px",
        },
      },
    },
    {
      id: "horizontal",
      label: "横向时间线",
      baseStyle: {
        root: {
          "border-top": "1px solid var(--color-border-strong)",
          padding: "12px 0 0 0",
        },
        "time-row": { display: "table", width: "100%" },
        "time-cell": {
          display: "table-cell",
          "vertical-align": "top",
          "padding-right": "16px",
        },
      },
    },
    {
      id: "compact",
      label: "紧凑时间线",
      baseStyle: {
        root: {
          "border-left": "2px solid var(--color-border-strong)",
          margin: "8px 0",
          padding: "0 0 2px 10px",
        },
      },
    },
  ],
  {
    baseStyle: {
      root: { margin: "16px 0" },
    },
    slots: ["root", "time-row", "time-cell"],
    directiveBody:
      "正文写为 Markdown 无序列表，每项以「**日期**：事件描述」形式书写一个时间节点，按时间先后顺序排列。",
    decorate: (element, ctx) => {
      if (ctx.variant !== "horizontal") return;
      const ul = findList(element);
      if (!ul) return;
      element.children = [buildTimelineRow(ul)];
    },
  }
);
