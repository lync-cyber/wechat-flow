import type { Element } from "hast";
import { z } from "zod";
import { slotElement } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

function buildCompareLedgerChildren(props: Element["properties"]): Element[] {
  const leftLabel = props["data-compare-left-label"];
  const leftValue = props["data-compare-left-value"];
  const rightLabel = props["data-compare-right-label"];
  const rightValue = props["data-compare-right-value"];
  const title = props["data-compare-title"];

  const children: Element[] = [];

  if (typeof title === "string" && title.trim() !== "") {
    children.push(slotElement("title", [{ type: "text", value: title }]));
  }

  const leftText = [leftLabel, leftValue]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join("：");
  const rightText = [rightLabel, rightValue]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join("：");

  const leftCell = slotElement("left", [{ type: "text", value: leftText }]);
  const rightCell = slotElement("right", [{ type: "text", value: rightText }]);

  children.push(slotElement("table", [leftCell, rightCell]));

  return children;
}

export const compare = defineBlock(
  "compare",
  "对比",
  z
    .object({
      "left-label": z.string().optional(),
      "left-value": z.string().optional(),
      "right-label": z.string().optional(),
      "right-value": z.string().optional(),
      title: z.string().optional(),
    })
    .strict(),
  "structured",
  [
    {
      id: "default",
      label: "标准对比",
      baseStyle: {
        root: {
          display: "table",
          width: "100%",
          "border-collapse": "collapse",
        },
      },
    },
    { id: "highlight-right", label: "突出右侧" },
    { id: "table-style", label: "表格对比" },
    {
      id: "ledger",
      label: "账本对比",
      baseStyle: {
        root: {
          margin: "16px 0",
        },
        title: {
          "text-align": "center",
          "font-weight": "600",
          "margin-bottom": "8px",
        },
        table: {
          display: "table",
          width: "100%",
        },
        left: {
          display: "table-cell",
          width: "50%",
          padding: "16px",
          background: "var(--color-surface-alt)",
        },
        right: {
          display: "table-cell",
          width: "50%",
          padding: "16px",
          background: "var(--color-code-bg)",
          "border-left": "1px solid var(--color-border)",
        },
      },
    },
    { id: "compact", label: "紧凑对比" },
  ],
  {
    root: {
      margin: "16px 0",
    },
  },
  ["root", "title", "table", "left", "right"],
  "默认变体正文写自由摘要文字；ledger 变体通过 left-label/left-value/right-label/right-value（可选 title）属性提供结构化左右列数据，此时正文内容不参与渲染。",
  (element, ctx) => {
    if (ctx.variant !== "ledger") return;
    const props = element.properties ?? {};
    const children = buildCompareLedgerChildren(props);
    const {
      "data-compare-left-label": _l1,
      "data-compare-left-value": _l2,
      "data-compare-right-label": _l3,
      "data-compare-right-value": _l4,
      "data-compare-title": _l5,
      ...restProps
    } = props;
    element.properties = restProps;
    element.children = children;
  }
);
