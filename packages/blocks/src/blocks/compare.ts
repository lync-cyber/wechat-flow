import type { Element } from "hast";
import { z } from "zod";
import { slotElement } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

const STRUCTURED_COMPARE_VARIANTS = new Set([
  "ledger",
  "highlight-right",
  "table-style",
  "compact",
]);

function buildCompareStructuredChildren(props: Element["properties"]): Element[] {
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
    {
      id: "highlight-right",
      label: "突出右侧",
      baseStyle: {
        table: {
          display: "table",
          width: "100%",
          "table-layout": "fixed",
          "border-collapse": "separate",
          "border-spacing": "12px 0",
        },
        left: {
          display: "table-cell",
          width: "50%",
          "vertical-align": "top",
          "box-sizing": "border-box",
          padding: "14px",
          border: "2px solid var(--color-brand)",
          "border-radius": "4px",
        },
        right: {
          display: "table-cell",
          width: "50%",
          "vertical-align": "top",
          "box-sizing": "border-box",
          padding: "14px",
          background: "var(--color-brand)",
          color: "var(--color-text-inverse)",
          "border-radius": "4px",
        },
      },
    },
    {
      id: "table-style",
      label: "表格对比",
      baseStyle: {
        table: {
          display: "block",
          "border-top": "1px solid var(--color-border)",
        },
        left: {
          display: "block",
          width: "100%",
          "box-sizing": "border-box",
          padding: "8px 0",
          "border-bottom": "1px solid var(--color-border)",
        },
        right: {
          display: "block",
          width: "100%",
          "box-sizing": "border-box",
          padding: "8px 0",
          "border-bottom": "1px solid var(--color-border)",
        },
      },
    },
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
    {
      id: "compact",
      label: "紧凑对比",
      baseStyle: {
        table: {
          display: "block",
        },
        left: {
          display: "block",
          width: "100%",
          "box-sizing": "border-box",
          padding: "12px 14px",
          "margin-bottom": "8px",
          background: "var(--color-surface-alt)",
          "border-left": "3px solid var(--color-brand)",
          "border-radius": "0 4px 4px 0",
        },
        right: {
          display: "block",
          width: "100%",
          "box-sizing": "border-box",
          padding: "12px 14px",
          background: "var(--color-code-bg)",
          "border-left": "3px solid var(--color-accent)",
          "border-radius": "0 4px 4px 0",
        },
      },
    },
  ],
  {
    baseStyle: {
      root: {
        margin: "16px 0",
      },
    },
    slots: ["root", "title", "table", "left", "right"],
    directiveBody:
      "默认变体正文写自由摘要文字；ledger/highlight-right/table-style/compact 变体通过 left-label/left-value/right-label/right-value（可选 title）属性提供结构化左右数据，此时正文内容不参与渲染。",
    decorate: (element, ctx) => {
      if (!STRUCTURED_COMPARE_VARIANTS.has(ctx.variant)) return;
      const props = element.properties ?? {};
      const children = buildCompareStructuredChildren(props);
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
    },
  }
);
