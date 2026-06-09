import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { RangeSetBuilder } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";

// Regex patterns for directive syntax
const DIRECTIVE_BLOCK_RE = /^(:{2,3}\s*)(\w+)/;
const FRONTMATTER_START_RE = /^---\s*$/;

// Decoration marks
const directiveKeywordMark = Decoration.mark({ class: "cm-directive-keyword" });
const directiveArgMark = Decoration.mark({ class: "cm-directive-arg" });
const frontmatterMark = Decoration.mark({ class: "cm-frontmatter" });

// ViewPlugin that adds directive + frontmatter decorations
const directivePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;

  let inFrontmatter = false;
  const pending: { from: number; to: number; deco: Decoration }[] = [];

  for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
    const line = doc.line(lineNum);
    const text = line.text;

    // Frontmatter detection (only at document start)
    if (lineNum === 1 && FRONTMATTER_START_RE.test(text)) {
      inFrontmatter = true;
      pending.push({ from: line.from, to: line.to, deco: frontmatterMark });
      continue;
    }
    if (inFrontmatter) {
      pending.push({ from: line.from, to: line.to, deco: frontmatterMark });
      if (lineNum > 1 && FRONTMATTER_START_RE.test(text)) {
        inFrontmatter = false;
      }
      continue;
    }

    // Directive block (:::keyword or ::keyword)
    const blockMatch = DIRECTIVE_BLOCK_RE.exec(text);
    if (blockMatch) {
      const markerEnd = line.from + blockMatch[1].length;
      const keywordEnd = markerEnd + blockMatch[2].length;
      pending.push({ from: line.from, to: markerEnd, deco: directiveKeywordMark });
      pending.push({ from: markerEnd, to: keywordEnd, deco: directiveKeywordMark });
      if (keywordEnd < line.to) {
        pending.push({ from: keywordEnd, to: line.to, deco: directiveArgMark });
      }
    }
  }

  // Sort by from position (required by RangeSetBuilder)
  pending.sort((a, b) => a.from - b.from || a.to - b.to);

  for (const { from, to, deco } of pending) {
    if (from < to) {
      builder.add(from, to, deco);
    }
  }

  return builder.finish();
}

// Theme for directive + frontmatter classes applied by the plugin
const directiveTheme = EditorView.theme({
  ".cm-directive-keyword": {
    color: "var(--color-accent, #b94a3e)",
    fontWeight: "var(--font-weight-medium, 500)",
    fontFamily: "var(--font-mono, monospace)",
  },
  ".cm-directive-arg": {
    color: "var(--color-text-secondary, #4a4541)",
  },
  ".cm-frontmatter": {
    backgroundColor: "var(--color-surface-sunken, #e7e3da)",
    color: "var(--color-text-secondary, #4a4541)",
  },
});

export function markdownLanguageExtension(): Extension[] {
  return [markdown({ base: markdownLanguage }), directivePlugin, directiveTheme];
}
