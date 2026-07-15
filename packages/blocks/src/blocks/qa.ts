import type { Element } from "hast";
import { z } from "zod";
import { slotElement } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

function paragraphsOf(element: Element): Element[] {
  return element.children.filter(
    (child): child is Element => child.type === "element" && child.tagName === "p"
  );
}

function textOf(children: Element["children"]): string {
  return children
    .map((child) => {
      if (child.type === "text") return child.value;
      if (child.type === "element") return textOf(child.children);
      return "";
    })
    .join("");
}

function leadingStrongIndex(paragraph: Element): number {
  return paragraph.children.findIndex(
    (child): child is Element => child.type === "element" && child.tagName === "strong"
  );
}

function decorateBubble(element: Element): void {
  for (const p of paragraphsOf(element)) {
    const idx = leadingStrongIndex(p);
    if (idx === -1) continue;
    const strong = p.children[idx] as Element;
    const lead = textOf(strong.children);
    const rest = p.children.filter((_, i) => i !== idx);
    if (lead.startsWith("问")) {
      p.children = [
        slotElement("qa-badge-q", [{ type: "text", value: "问" }], { inline: true }),
        ...rest,
      ];
    } else if (lead.startsWith("答")) {
      p.children = [
        slotElement("qa-badge-a", [{ type: "text", value: "答" }], { inline: true }),
        ...rest,
      ];
    }
  }
}

function decorateBoldQ(element: Element): void {
  let qCount = 0;
  for (const p of paragraphsOf(element)) {
    const idx = leadingStrongIndex(p);
    if (idx === -1) continue;
    const strong = p.children[idx] as Element;
    const lead = textOf(strong.children);
    if (lead.startsWith("问")) {
      qCount += 1;
      const rest = p.children.filter((_, i) => i !== idx);
      p.children = [
        slotElement("q-label", [{ type: "text", value: `Q.${String(qCount).padStart(2, "0")}` }], {
          inline: true,
        }),
        ...rest,
      ];
      p.properties = { ...(p.properties ?? {}), "data-block-slot": "question" };
    } else if (lead.startsWith("答")) {
      p.properties = { ...(p.properties ?? {}), "data-block-slot": "answer" };
    }
  }
}

export const qa = defineBlock(
  "qa",
  "问答",
  z.object({}).strict(),
  "structured",
  [
    { id: "default", label: "标准问答" },
    {
      id: "bubble",
      label: "气泡问答",
      baseStyle: {
        root: { padding: "4px 0" },
        "qa-badge-q": {
          display: "inline-block",
          width: "22px",
          height: "22px",
          "line-height": "22px",
          "text-align": "center",
          "border-radius": "50%",
          background: "var(--color-brand)",
          color: "var(--color-text-inverse)",
          "font-size": "12px",
          "font-weight": "700",
          "margin-right": "6px",
        },
        "qa-badge-a": {
          display: "inline-block",
          width: "22px",
          height: "22px",
          "line-height": "19px",
          "text-align": "center",
          "border-radius": "50%",
          background: "transparent",
          border: "1.5px solid var(--color-brand)",
          color: "var(--color-brand)",
          "font-size": "12px",
          "font-weight": "700",
          "margin-right": "6px",
        },
      },
    },
    {
      id: "bold-q",
      label: "粗体问题",
      baseStyle: {
        root: {
          "border-top": "1px solid var(--color-border)",
          "padding-top": "8px",
        },
        question: {
          "font-weight": "700",
          "border-bottom": "1px solid var(--color-text-primary)",
          "padding-bottom": "6px",
          "margin-bottom": "8px",
        },
        answer: {
          color: "var(--color-text-muted)",
        },
        "q-label": {
          color: "var(--color-text-muted)",
          "font-size": "11px",
          "letter-spacing": "0.08em",
          "margin-right": "8px",
        },
      },
    },
  ],
  {
    baseStyle: {
      root: {
        margin: "16px 0",
        padding: "0",
      },
    },
    slots: ["root", "qa-badge-q", "qa-badge-a", "question", "answer", "q-label"],
    directiveBody:
      "正文按一问一答顺序书写，每组问答以「**问**：」开头的段落紧跟「**答**：」开头的段落表达。",
    decorate: (element, ctx) => {
      if (ctx.variant === "bubble") {
        decorateBubble(element);
        return;
      }
      if (ctx.variant === "bold-q") {
        decorateBoldQ(element);
      }
    },
  }
);
