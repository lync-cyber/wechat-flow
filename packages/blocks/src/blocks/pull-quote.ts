import type { Element } from "hast";
import { z } from "zod";
import { injectLeadingInlineNode, slotElement } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

function buildQuoteMarkNode(): Element {
  return slotElement("quote-mark", [{ type: "text", value: "「" }], { inline: true });
}

function buildPullQuoteDecoration(authorText: string): [quoteMark: Element, author: Element] {
  const quoteMark = buildQuoteMarkNode();
  const author = slotElement("author", [{ type: "text", value: `—— ${authorText}` }]);

  return [quoteMark, author];
}

function buildKickerNode(): Element {
  return slotElement("kicker", [{ type: "text", value: "QUOTE · 引言" }]);
}

function buildGlossNode(authorText: string): Element {
  return slotElement("gloss", [{ type: "text", value: `—— ${authorText}` }]);
}

export const pullQuote = defineBlock(
  "pull-quote",
  "摘引",
  z
    .object({
      author: z.string().optional(),
    })
    .strict(),
  "emphasis",
  [
    {
      id: "default",
      label: "标准摘引",
      baseStyle: {
        root: {
          "text-align": "center",
          padding: "24px 16px",
          margin: "24px 0",
          "font-size": "1.25em",
        },
      },
    },
    {
      id: "large",
      label: "大字摘引",
      baseStyle: {
        root: {
          "text-align": "left",
          padding: "24px 16px",
          margin: "24px 0",
          "font-size": "24px",
        },
        "quote-mark": {
          display: "inline-block",
          "vertical-align": "top",
          "line-height": "1",
          "font-size": "32px",
          opacity: "0.35",
          color: "var(--color-brand)",
        },
      },
    },
    {
      id: "decorated",
      label: "装饰摘引",
      baseStyle: {
        root: {
          "text-align": "center",
          padding: "24px 16px",
          margin: "24px 0",
          "font-size": "1.25em",
        },
        "quote-mark": {
          display: "inline-block",
          "vertical-align": "top",
          "line-height": "1",
          "font-size": "28px",
          opacity: "0.35",
          color: "var(--color-brand)",
        },
        author: {
          "margin-top": "10px",
          "text-align": "center",
          "font-size": "13px",
          color: "var(--color-text-muted)",
        },
      },
    },
    {
      id: "minimal",
      label: "简约摘引",
      baseStyle: {
        root: {
          "text-align": "center",
          padding: "24px 16px",
          margin: "24px 0",
          "border-top": "1px solid var(--color-brand)",
          "border-bottom": "1px solid var(--color-brand)",
        },
        kicker: {
          display: "inline-block",
          "text-align": "center",
          "font-size": "11px",
          "font-weight": "700",
          "letter-spacing": "5.6px",
          "text-transform": "uppercase",
          color: "var(--color-text-muted)",
        },
      },
    },
    {
      id: "bordered",
      label: "边框摘引",
      baseStyle: {
        root: {
          padding: "16px 0",
          margin: "24px 0",
          "border-top": "1px solid var(--color-accent)",
          "border-bottom": "1px solid var(--color-accent)",
        },
        gloss: {
          "text-align": "center",
          "font-size": "12px",
          "letter-spacing": "3.2px",
          "line-height": "1.6",
          color: "var(--color-text-muted)",
        },
      },
    },
  ],
  {
    baseStyle: {
      root: {},
    },
    slots: ["root", "quote-mark", "author", "kicker", "gloss"],
    decorate: (element, ctx) => {
      if (ctx.variant === "decorated") {
        const authorText = ctx.attrs.author;
        if (typeof authorText !== "string") return;
        const [quoteMark, author] = buildPullQuoteDecoration(authorText);
        const { "data-pull-quote-author": _stash, ...restProps } = element.properties ?? {};
        element.properties = restProps;
        injectLeadingInlineNode(element, quoteMark);
        element.children = [...element.children, author];
        return;
      }
      if (ctx.variant === "large") {
        injectLeadingInlineNode(element, buildQuoteMarkNode());
        return;
      }
      if (ctx.variant === "minimal") {
        element.children = [buildKickerNode(), ...element.children];
        return;
      }
      if (ctx.variant === "bordered") {
        const authorText = ctx.attrs.author;
        if (typeof authorText !== "string") return;
        const { "data-pull-quote-author": _stash, ...restProps } = element.properties ?? {};
        element.properties = restProps;
        element.children = [
          buildGlossNode(authorText),
          ...element.children,
          buildGlossNode(authorText),
        ];
        return;
      }
    },
  }
);
