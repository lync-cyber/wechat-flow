import type { Element } from "hast";
import { z } from "zod";
import { injectLeadingInlineNode, slotElement } from "../decorate-utils.ts";
import { defineBlock } from "../factory.ts";

function buildPullQuoteDecoration(authorText: string): [quoteMark: Element, author: Element] {
  const quoteMark = slotElement("quote-mark", [{ type: "text", value: "「" }], { inline: true });
  const author = slotElement("author", [{ type: "text", value: `—— ${authorText}` }]);

  return [quoteMark, author];
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
    { id: "large", label: "大字摘引" },
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
    { id: "minimal", label: "简约摘引" },
    { id: "bordered", label: "边框摘引" },
  ],
  {
    baseStyle: {
      root: {},
    },
    slots: ["root", "quote-mark", "author"],
    decorate: (element, ctx) => {
      if (ctx.variant !== "decorated") return;
      const authorText = ctx.attrs.author;
      if (typeof authorText !== "string") return;
      const [quoteMark, author] = buildPullQuoteDecoration(authorText);
      const { "data-pull-quote-author": _stash, ...restProps } = element.properties ?? {};
      element.properties = restProps;
      injectLeadingInlineNode(element, quoteMark);
      element.children = [...element.children, author];
    },
  }
);
