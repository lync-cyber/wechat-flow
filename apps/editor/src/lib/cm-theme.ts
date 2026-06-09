import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

export const cmBaseTheme = EditorView.theme(
  {
    "&": {
      fontFamily: "var(--font-mono, monospace)",
      fontSize: "var(--font-size-sm, 13px)",
      backgroundColor: "var(--color-surface, #faf8f5)",
      color: "var(--color-text-primary, #1c1917)",
      height: "100%",
    },
    ".cm-content": {
      caretColor: "var(--color-brand, #2d5a4e)",
      padding: "16px",
    },
    ".cm-cursor": {
      borderLeftColor: "var(--color-brand, #2d5a4e)",
    },
    ".cm-line": {
      lineHeight: "var(--line-height-relaxed, 1.8)",
    },
    "&.cm-readonly .cm-content": {
      backgroundColor: "var(--color-surface-elevated, #f4f1ec)",
      cursor: "default",
    },
  },
  { dark: false }
);

const cmHighlightStyle = HighlightStyle.define([
  // Headings
  {
    tag: tags.heading1,
    color: "var(--color-brand, #2d5a4e)",
    fontWeight: "var(--font-weight-semibold, 600)",
  },
  {
    tag: tags.heading2,
    color: "var(--color-brand, #2d5a4e)",
    fontWeight: "var(--font-weight-semibold, 600)",
  },
  {
    tag: tags.heading3,
    color: "var(--color-brand, #2d5a4e)",
    fontWeight: "var(--font-weight-semibold, 600)",
  },
  {
    tag: tags.heading,
    color: "var(--color-brand, #2d5a4e)",
    fontWeight: "var(--font-weight-semibold, 600)",
  },
  // Bold / strong
  { tag: tags.strong, color: "var(--color-text-primary, #1c1917)", fontWeight: "bold" },
  // Italic / emphasis
  {
    tag: tags.emphasis,
    color: "var(--color-text-secondary, #4a4541)",
    fontStyle: "italic",
  },
  // Inline code
  {
    tag: tags.monospace,
    color: "var(--color-accent, #b94a3e)",
    fontFamily: "var(--font-mono, monospace)",
    backgroundColor: "var(--color-accent-subtle, #f5e8e7)",
  },
  // List items / markers
  {
    tag: tags.list,
    color: "var(--color-brand-muted, #a3c4bc)",
  },
  // Blockquote
  {
    tag: tags.quote,
    color: "var(--color-text-secondary, #4a4541)",
    fontStyle: "italic",
  },
  // Links
  { tag: tags.link, color: "var(--color-text-link, #2d5a4e)", textDecoration: "underline" },
  { tag: tags.url, color: "var(--color-text-muted, #7a746c)" },
  // Keywords (used for directive markers)
  {
    tag: tags.keyword,
    color: "var(--color-accent, #b94a3e)",
    fontWeight: "var(--font-weight-medium, 500)",
    fontFamily: "var(--font-mono, monospace)",
  },
  // Comments (used for frontmatter / meta)
  {
    tag: tags.comment,
    color: "var(--color-text-secondary, #4a4541)",
    backgroundColor: "var(--color-surface-sunken, #e7e3da)",
  },
]);

export const cmSyntaxHighlighting = syntaxHighlighting(cmHighlightStyle);
