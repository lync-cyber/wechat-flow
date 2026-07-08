import type { Element } from "hast";
import { z } from "zod";
import { slotElement } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

function textContentOf(children: Element["children"]): string {
  return children
    .map((child) => {
      if (child.type === "text") return child.value;
      if (child.type === "element") return textContentOf(child.children);
      return "";
    })
    .join("");
}

function buildStepCard(listItem: Element, isLast: boolean): Element {
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
    "data-variant": "card",
    "data-steps-item": "card",
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

function buildStepsCardList(ul: Element): Element[] {
  const listItems = ul.children.filter(
    (child): child is Element => child.type === "element" && child.tagName === "li"
  );
  return listItems.map((li, index) => buildStepCard(li, index === listItems.length - 1));
}

export const steps = defineBlock(
  "steps",
  "步骤",
  z.object({}).strict(),
  "structured",
  [
    { id: "default", label: "竖排步骤" },
    { id: "horizontal", label: "横排步骤" },
    { id: "numbered", label: "编号步骤" },
    { id: "circle-numbered", label: "圆圈编号步骤" },
    { id: "timeline", label: "时间线步骤" },
    { id: "arrow", label: "箭头步骤" },
    {
      id: "card",
      label: "卡片步骤",
      baseStyle: {
        root: {
          background: "#F3F0EB",
          border: "1px solid #D6D3CE",
          "border-radius": "6px",
          padding: "12px 16px",
          "margin-bottom": "12px",
        },
        title: {
          "font-weight": "600",
        },
        description: {
          color: "#44403C",
          "font-size": "13px",
        },
      },
    },
    { id: "minimal", label: "简约步骤" },
    { id: "filled", label: "填充步骤" },
    { id: "compact", label: "紧凑步骤" },
  ],
  {
    root: {
      margin: "16px 0",
      padding: "0",
    },
  },
  ["root", "title", "description"],
  "正文写为 Markdown 无序列表，每项以「**标题**：描述」形式书写一个步骤；card 变体额外将每项渲染为独立卡片。",
  (element, ctx) => {
    if (ctx.variant !== "card") return;
    const ul = element.children.find(
      (child): child is Element => child.type === "element" && child.tagName === "ul"
    );
    if (!ul) return;
    const cards = buildStepsCardList(ul);
    const {
      "data-block": _block,
      "data-variant": _variant,
      ...restProps
    } = element.properties ?? {};
    element.properties = restProps;
    element.children = cards;
  }
);
