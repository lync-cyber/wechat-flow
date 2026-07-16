import type { Element } from "hast";
import { z } from "zod";
import { defineBlock } from "../factory.ts";

const CELL_BASE: Record<string, string> = {
  padding: "8px 12px",
  border: "1px solid var(--color-border)",
  color: "var(--color-text-primary)",
};

function collectElementsByTag(root: Element, tagNames: Set<string>): Element[] {
  const found: Element[] = [];
  function walk(node: Element): void {
    for (const child of node.children) {
      if (child.type !== "element") continue;
      const el = child as Element;
      if (tagNames.has(el.tagName)) found.push(el);
      walk(el);
    }
  }
  walk(root);
  return found;
}

function markCellSlot(cell: Element, slot: string): void {
  cell.properties = { ...(cell.properties ?? {}), "data-block-slot": slot };
}

function decorateStriped(element: Element): void {
  const [tbody] = collectElementsByTag(element, new Set(["tbody"]));
  if (!tbody) return;
  const rows = tbody.children.filter(
    (child): child is Element => child.type === "element" && child.tagName === "tr"
  );
  rows.forEach((row, index) => {
    if (index % 2 !== 0) return;
    for (const cell of row.children) {
      if (cell.type === "element" && (cell.tagName === "td" || cell.tagName === "th")) {
        markCellSlot(cell, "cell-odd");
      }
    }
  });
}

function decorateCompact(element: Element): void {
  for (const cell of collectElementsByTag(element, new Set(["td"]))) {
    markCellSlot(cell, "cell");
  }
  for (const header of collectElementsByTag(element, new Set(["th"]))) {
    markCellSlot(header, "header-cell");
  }
}

function decorateHighlightHeader(element: Element): void {
  for (const header of collectElementsByTag(element, new Set(["th"]))) {
    markCellSlot(header, "header-cell");
  }
}

export const table = defineBlock(
  "table",
  "表格",
  z.object({}).strict(),
  "text",
  [
    { id: "default", label: "标准表格" },
    {
      id: "striped",
      label: "条纹表格",
      baseStyle: {
        root: {
          "border-top": "1px solid var(--color-border-strong)",
          "border-bottom": "1px solid var(--color-border-strong)",
        },
        "cell-odd": {
          ...CELL_BASE,
          "background-color": "var(--color-surface-alt)",
        },
      },
    },
    {
      id: "bordered",
      label: "全边框表格",
      baseStyle: {
        root: {
          border: "1px solid var(--color-border)",
          "border-radius": "4px",
          overflow: "hidden",
        },
      },
    },
    {
      id: "compact",
      label: "紧凑表格",
      baseStyle: {
        cell: {
          ...CELL_BASE,
          padding: "4px 8px",
          "font-size": "var(--font-size-sm)",
        },
        "header-cell": {
          ...CELL_BASE,
          padding: "4px 8px",
          "font-size": "var(--font-size-sm)",
          "font-weight": "600",
          "background-color": "var(--color-surface-alt)",
        },
      },
    },
    {
      id: "highlight-header",
      label: "高亮表头表格",
      baseStyle: {
        root: {
          "border-top": "2px solid var(--color-border-strong)",
          "border-bottom": "2px solid var(--color-border-strong)",
        },
        "header-cell": {
          border: "none",
          "border-bottom": "2px solid var(--color-border-strong)",
          background: "transparent",
          padding: "8px 12px",
          "font-weight": "600",
          color: "var(--color-text-primary)",
        },
      },
    },
  ],
  {
    slots: ["root", "cell", "cell-odd", "header-cell"],
    decorate: (element, ctx) => {
      if (ctx.variant === "striped") decorateStriped(element);
      else if (ctx.variant === "compact") decorateCompact(element);
      else if (ctx.variant === "highlight-header") decorateHighlightHeader(element);
    },
  }
);
