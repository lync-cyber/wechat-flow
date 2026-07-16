import type { Element } from "hast";
import { z } from "zod";
import { findList, listItemsOf, slotElement, textContentOf } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

function buildStepCard(listItem: Element, isLast: boolean, variantId: string): Element {
  const paragraph = listItem.children.find(
    (child): child is Element => child.type === "element" && child.tagName === "p"
  );
  const paragraphChildren = paragraph?.children ?? listItem.children;

  const strongChild = paragraphChildren.find(
    (child): child is Element => child.type === "element" && child.tagName === "strong"
  );

  const title = strongChild
    ? textContentOf(strongChild.children)
    : textContentOf(paragraphChildren);
  const afterStrong = strongChild
    ? paragraphChildren.slice(paragraphChildren.indexOf(strongChild) + 1)
    : [];
  const description = textContentOf(afterStrong).replace(/^[：:，,\s]+/, "");

  const titleEl = slotElement("title", [{ type: "text", value: title }]);

  const cardChildren: Element[] = [titleEl];
  if (description.length > 0) {
    cardChildren.push(slotElement("description", [{ type: "text", value: description }]));
  }

  const properties: Element["properties"] = {
    "data-block": "steps",
    "data-variant": variantId,
    "data-steps-item": variantId,
  };
  if (isLast) {
    properties["data-block-slot-last"] = "true";
  }

  return {
    type: "element",
    tagName: "section",
    properties,
    children: cardChildren,
  };
}

function buildStepsCardList(ul: Element, variantId: string): Element[] {
  const listItems = listItemsOf(ul);
  return listItems.map((li, index) => buildStepCard(li, index === listItems.length - 1, variantId));
}

const CJK_ORDINALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];

function cjkOrdinal(index: number): string {
  return CJK_ORDINALS[index] ?? String(index + 1);
}

function buildStepLines(ul: Element, buildMarker: (index: number) => Element | null): Element[] {
  return listItemsOf(ul).map((li, index) => {
    const marker = buildMarker(index);
    return slotElement("step-line", marker ? [marker, ...li.children] : [...li.children]);
  });
}

function buildNumberedLines(ul: Element): Element[] {
  return buildStepLines(ul, (index) =>
    slotElement("step-number", [{ type: "text", value: `${cjkOrdinal(index)}、` }], {
      inline: true,
    })
  );
}

function buildCircleNumberedLines(ul: Element): Element[] {
  return buildStepLines(ul, (index) =>
    slotElement("step-marker", [{ type: "text", value: String(index + 1) }], { inline: true })
  );
}

function buildTimelineLines(ul: Element): Element[] {
  return buildStepLines(ul, () => slotElement("step-dot", [], { inline: true }));
}

function buildArrowLines(ul: Element): Element[] {
  return buildStepLines(ul, (index) =>
    index === 0 ? null : slotElement("step-arrow", [{ type: "text", value: "→" }], { inline: true })
  );
}

function buildMinimalLines(ul: Element): Element[] {
  return buildStepLines(ul, () => null);
}

function buildHorizontalRow(ul: Element): Element {
  const cells = listItemsOf(ul).map((li) => slotElement("step-cell", [...li.children]));
  return slotElement("step-row", cells);
}

interface StepCardStyleOverrides {
  root?: Record<string, string>;
  title?: Record<string, string>;
  description?: Record<string, string>;
}

const STEP_CARD_BASE_STYLE = {
  root: {
    background: "var(--color-surface-alt)",
    border: "1px solid #d6d3ce",
    "border-radius": "6px",
    padding: "12px 16px",
    "margin-bottom": "12px",
  },
  title: { "font-weight": "600" },
  description: {
    color: "var(--color-text-secondary)",
    "font-size": "var(--font-size-sm)",
  },
} as const;

function stepCardVariantStyle(
  overrides: StepCardStyleOverrides = {}
): Record<string, Record<string, string>> {
  return {
    root: { ...STEP_CARD_BASE_STYLE.root, ...overrides.root },
    title: { ...STEP_CARD_BASE_STYLE.title, ...overrides.title },
    description: { ...STEP_CARD_BASE_STYLE.description, ...overrides.description },
  };
}

export const steps = defineBlock(
  "steps",
  "步骤",
  z.object({}).strict(),
  "structured",
  [
    { id: "default", label: "竖排步骤" },
    {
      id: "horizontal",
      label: "横排步骤",
      baseStyle: {
        root: {
          "border-top": "1px solid var(--color-border-strong)",
          "padding-top": "12px",
        },
        "step-row": { display: "table", width: "100%" },
        "step-cell": {
          display: "table-cell",
          "vertical-align": "top",
          "padding-right": "16px",
        },
      },
    },
    {
      id: "numbered",
      label: "编号步骤",
      baseStyle: {
        "step-number": {
          color: "var(--color-brand)",
          "font-weight": "700",
          "margin-right": "4px",
        },
      },
    },
    {
      id: "circle-numbered",
      label: "圆圈编号步骤",
      baseStyle: {
        "step-marker": {
          display: "inline-block",
          width: "20px",
          height: "20px",
          "line-height": "20px",
          "text-align": "center",
          "border-radius": "50%",
          background: "var(--color-brand)",
          color: "var(--color-text-inverse)",
          "font-size": "12px",
          "font-weight": "700",
          "margin-right": "8px",
        },
      },
    },
    {
      id: "timeline",
      label: "时间线步骤",
      baseStyle: {
        root: {
          "border-left": "2px dotted var(--color-brand)",
          "padding-left": "16px",
        },
        "step-dot": {
          display: "inline-block",
          width: "8px",
          height: "8px",
          "border-radius": "50%",
          background: "var(--color-brand)",
          "margin-right": "8px",
          "vertical-align": "middle",
        },
      },
    },
    {
      id: "arrow",
      label: "箭头步骤",
      baseStyle: {
        "step-arrow": {
          color: "var(--color-text-muted)",
          "margin-right": "4px",
          "font-weight": "700",
        },
      },
    },
    {
      id: "card",
      label: "卡片步骤",
      baseStyle: stepCardVariantStyle(),
    },
    { id: "minimal", label: "简约步骤" },
    {
      id: "filled",
      label: "填充步骤",
      baseStyle: stepCardVariantStyle({
        root: {
          background: "var(--color-brand)",
          border: "1px solid var(--color-brand-dark)",
        },
        title: { color: "var(--color-text-inverse)" },
        description: { color: "var(--color-text-inverse)" },
      }),
    },
    {
      id: "compact",
      label: "紧凑步骤",
      baseStyle: stepCardVariantStyle({
        root: {
          padding: "6px 10px",
          "margin-bottom": "6px",
        },
      }),
    },
  ],
  {
    baseStyle: {
      root: {
        margin: "16px 0",
        padding: "0",
      },
      "step-line": { "margin-bottom": "8px" },
    },
    slots: [
      "root",
      "title",
      "description",
      "step-line",
      "step-number",
      "step-marker",
      "step-dot",
      "step-arrow",
      "step-row",
      "step-cell",
    ],
    directiveBody:
      "正文写为 Markdown 无序列表，每项以「**标题**：描述」形式书写一个步骤；card/filled/compact 变体额外将每项渲染为独立卡片。",
    decorate: (element, ctx) => {
      if (ctx.variant === "card" || ctx.variant === "filled" || ctx.variant === "compact") {
        const ul = findList(element);
        if (!ul) return;
        const cards = buildStepsCardList(ul, ctx.variant);
        const {
          "data-block": _block,
          "data-variant": _variant,
          ...restProps
        } = element.properties ?? {};
        element.properties = restProps;
        element.children = cards;
        return;
      }

      const ul = findList(element);
      if (!ul) return;

      if (ctx.variant === "horizontal") {
        element.children = [buildHorizontalRow(ul)];
        return;
      }
      if (ctx.variant === "numbered") {
        element.children = buildNumberedLines(ul);
        return;
      }
      if (ctx.variant === "circle-numbered") {
        element.children = buildCircleNumberedLines(ul);
        return;
      }
      if (ctx.variant === "timeline") {
        element.children = buildTimelineLines(ul);
        return;
      }
      if (ctx.variant === "arrow") {
        element.children = buildArrowLines(ul);
        return;
      }
      if (ctx.variant === "minimal") {
        element.children = buildMinimalLines(ul);
        return;
      }
    },
  }
);
