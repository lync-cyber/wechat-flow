import type { Element } from "hast";
import { z } from "zod";
import { defineBlock } from "../factory.ts";

const CHROME_SLOT_VARIANTS = new Set(["minimal", "light"]);

function collectElementsByTag(root: Element, tagName: string): Element[] {
  const found: Element[] = [];
  function walk(node: Element): void {
    for (const child of node.children) {
      if (child.type !== "element") continue;
      const el = child as Element;
      if (el.tagName === tagName) found.push(el);
      walk(el);
    }
  }
  walk(root);
  return found;
}

function markSlot(el: Element, slot: string): void {
  el.properties = { ...(el.properties ?? {}), "data-block-slot": slot };
}

const MINIMAL_RESET: Record<string, string> = {
  border: "none",
  background: "transparent",
  padding: "0",
};

export const codeBlock = defineBlock(
  "code-block",
  "代码块",
  z.object({}).strict(),
  "text",
  [
    { id: "default", label: "暗色代码块" },
    {
      id: "light",
      label: "亮色代码块",
      baseStyle: {
        pre: {
          "background-color": "var(--color-code-light-bg)",
          color: "var(--color-code-light-text)",
        },
        code: {
          "background-color": "var(--color-code-light-bg)",
          color: "var(--color-code-light-text)",
        },
      },
    },
    {
      id: "minimal",
      label: "简约代码块",
      baseStyle: {
        pre: { ...MINIMAL_RESET },
        code: { ...MINIMAL_RESET },
      },
    },
  ],
  {
    slots: ["root", "pre", "code"],
    decorate: (element, ctx) => {
      if (!CHROME_SLOT_VARIANTS.has(ctx.variant)) return;
      for (const pre of collectElementsByTag(element, "pre")) {
        markSlot(pre, "pre");
      }
      for (const code of collectElementsByTag(element, "code")) {
        markSlot(code, "code");
      }
    },
  }
);
