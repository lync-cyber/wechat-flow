import type { Element } from "hast";
import { z } from "zod";
import { slotElement } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

function findList(element: Element): Element | undefined {
  return element.children.find(
    (child): child is Element =>
      child.type === "element" && (child.tagName === "ul" || child.tagName === "ol")
  );
}

function listItemsOf(list: Element): Element[] {
  return list.children.filter(
    (child): child is Element => child.type === "element" && child.tagName === "li"
  );
}

function isTaskChecked(li: Element): boolean | undefined {
  const input = li.children.find(
    (child): child is Element => child.type === "element" && child.tagName === "input"
  );
  const checked = input?.properties?.checked;
  return typeof checked === "boolean" ? checked : undefined;
}

function stripCheckboxArtifacts(li: Element): Element["children"] {
  const withoutInput = li.children.filter(
    (child) => !(child.type === "element" && child.tagName === "input")
  );
  if (
    withoutInput.length > 0 &&
    withoutInput[0].type === "text" &&
    withoutInput[0].value.trim() === ""
  ) {
    return withoutInput.slice(1);
  }
  return withoutInput;
}

function buildMarkerLines(
  list: Element,
  buildMarkerText: (li: Element, index: number) => string
): Element[] {
  return listItemsOf(list).map((li, index) => {
    const marker = slotElement(
      "list-marker",
      [{ type: "text", value: buildMarkerText(li, index) }],
      { inline: true }
    );
    return slotElement("list-item", [
      marker,
      { type: "text", value: " " },
      ...stripCheckboxArtifacts(li),
    ]);
  });
}

function buildBulletLines(list: Element): Element[] {
  return buildMarkerLines(list, () => "●");
}

function buildNumberedLines(list: Element): Element[] {
  return buildMarkerLines(list, (_li, index) => `${index + 1}.`);
}

function buildChecklistLines(list: Element): Element[] {
  return buildMarkerLines(list, (li) => (isTaskChecked(li) ? "☑" : "☐"));
}

export const list = defineBlock(
  "list",
  "列表",
  z.object({}).strict(),
  "text",
  [
    { id: "default", label: "标准列表" },
    {
      id: "bullet",
      label: "圆点列表",
      baseStyle: {
        "list-marker": {
          color: "var(--color-brand)",
          "font-size": "12px",
        },
      },
    },
    {
      id: "numbered",
      label: "编号列表",
      baseStyle: {
        "list-marker": {
          color: "var(--color-brand)",
          "font-weight": "700",
        },
      },
    },
    {
      id: "checklist",
      label: "清单列表",
      baseStyle: {
        "list-marker": {
          color: "var(--color-text-muted)",
        },
      },
    },
  ],
  {
    slots: ["root", "list-item", "list-marker"],
    decorate: (element, ctx) => {
      const sourceList = findList(element);
      if (!sourceList) return;
      if (ctx.variant === "bullet") {
        element.children = buildBulletLines(sourceList);
        return;
      }
      if (ctx.variant === "numbered") {
        element.children = buildNumberedLines(sourceList);
        return;
      }
      if (ctx.variant === "checklist") {
        element.children = buildChecklistLines(sourceList);
      }
    },
  }
);
