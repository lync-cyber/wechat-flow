import type { ThemeDefinition } from "@wechat-flow/contracts";
import { describe, expect, it } from "vitest";
import { validateThemeGuard } from "../../../packages/core/src/guard/index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMinTokens(): Record<string, string> {
  const t: Record<string, string> = {};
  t["--color-background"] = "#FFFFFF";
  t["--color-text-primary"] = "#000000";
  t["--color-text-secondary"] = "#333333";
  t["--color-link"] = "#0000CC";
  t["--color-code-text"] = "#222222";
  t["--color-code-bg"] = "#F5F5F5";
  t["--color-quote-bg"] = "#F0F0F0";
  t["--color-surface"] = "#FFFFFF";
  t["--color-surface-alt"] = "#FAFAFA";
  t["--color-text-muted"] = "#666666";
  t["--color-text-inverse"] = "#FFFFFF";
  t["--color-brand"] = "#2D5A4E";
  t["--color-brand-light"] = "#3D7A68";
  t["--color-brand-dark"] = "#1E3D35";
  t["--color-accent"] = "#B94A3E";
  t["--color-accent-light"] = "#D45E51";
  t["--color-accent-dark"] = "#8F3830";
  t["--color-border"] = "#D6D3CE";
  t["--color-border-strong"] = "#A8A29E";
  t["--color-quote-border"] = "#2D5A4E";
  t["--color-hr"] = "#CCCCCC";
  t["--color-overlay"] = "#00000080";
  t["--spacing-xs"] = "4px";
  t["--spacing-sm"] = "8px";
  t["--spacing-md"] = "12px";
  t["--spacing-lg"] = "16px";
  t["--spacing-xl"] = "24px";
  t["--spacing-2xl"] = "32px";
  t["--spacing-3xl"] = "48px";
  t["--spacing-paragraph-bottom"] = "12px";
  t["--spacing-heading-bottom"] = "16px";
  t["--spacing-list-item"] = "6px";
  t["--spacing-code-inline-h"] = "4px";
  t["--spacing-code-inline-v"] = "2px";
  t["--spacing-blockquote-h"] = "16px";
  t["--spacing-blockquote-v"] = "10px";
  t["--font-family-body"] = "serif";
  t["--font-family-heading"] = "serif";
  t["--font-family-mono"] = "monospace";
  t["--font-size-base"] = "15px";
  t["--font-size-sm"] = "13px";
  t["--font-size-lg"] = "17px";
  t["--font-size-h1"] = "22px";
  t["--font-size-h2"] = "19px";
  t["--font-size-h3"] = "17px";
  t["--font-size-h4"] = "16px";
  t["--font-size-h5"] = "15px";
  t["--font-size-h6"] = "14px";
  t["--font-weight-normal"] = "400";
  t["--font-weight-medium"] = "500";
  t["--font-weight-bold"] = "700";
  t["--font-line-height-body"] = "1.85";
  t["--decoration-hr-color"] = "#D6D3CE";
  t["--decoration-hr-style"] = "solid";
  t["--decoration-hr-width"] = "1px";
  t["--decoration-border-radius-sm"] = "3px";
  t["--decoration-border-radius-md"] = "6px";
  t["--decoration-link-underline"] = "underline";
  t["--align-text-body"] = "left";
  t["--align-text-heading"] = "left";
  return t;
}

const BASELINE_BLOCKS: Record<string, Record<string, Record<string, string>>> = {
  h1: { root: { "font-size": "2em" } },
  h2: { root: { "font-size": "1.5em" } },
  h3: { root: { "font-size": "1.3em" } },
  h4: { root: { "font-size": "1.1em" } },
  h5: { root: { "font-size": "1em" } },
  h6: { root: { "font-size": "0.9em" } },
  p: { root: { "line-height": "1.8" } },
  blockquote: { root: { "border-left": "4px solid #ccc" } },
  code: { root: { "font-family": "monospace" } },
  hr: { root: { "border-top": "1px solid #ccc" } },
};

const STARTER_MARKDOWN = [
  "# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6",
  "\nParagraph.\n\n> Blockquote\n\n`code`\n\n---\n\n- list\n\n[link](https://example.com)",
  "\n```\nblock\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n![img](https://example.com/img.png)",
  "\n:::callout\nx\n:::\n:::card\nx\n:::\n:::steps\nx\n:::\n:::quote\nx\n:::\n:::pull-quote\nx\n:::\n:::compare\nx\n:::",
].join("");

function makeValidTheme(metaOverride?: ThemeDefinition["meta"]): ThemeDefinition {
  return {
    id: "test-theme",
    name: "Test Theme",
    tokens: makeMinTokens(),
    blocks: BASELINE_BLOCKS,
    assets: {},
    meta: metaOverride,
    templates: [
      {
        themeId: "test-theme",
        templateId: "starter",
        markdown: STARTER_MARKDOWN,
        metadata: { description: "starter" },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// AC-004: metadata-completeness
// ---------------------------------------------------------------------------

describe("metadata-completeness: positive — author and wcagContrast.checked=true present", () => {
  it("does not produce a metadata-completeness failure when meta is complete", () => {
    const theme = makeValidTheme({
      author: "wechat-flow",
      wcagContrast: { checked: true, minRatio: 4.5 },
    });
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "metadata-completeness");
    expect(failure).toBeUndefined();
  });
});

describe("metadata-completeness: negative — missing author", () => {
  it("produces error when meta.author is absent", () => {
    const theme = makeValidTheme({
      // no author field
      wcagContrast: { checked: true, minRatio: 4.5 },
    });
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "metadata-completeness");
    expect(failure).toBeDefined();
    expect(failure?.severity).toBe("error");
  });

  it("produces error when meta.author is an empty string", () => {
    const theme = makeValidTheme({
      author: "",
      wcagContrast: { checked: true, minRatio: 4.5 },
    });
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "metadata-completeness");
    expect(failure).toBeDefined();
    expect(failure?.severity).toBe("error");
  });

  it("produces error when meta is undefined entirely", () => {
    const theme = makeValidTheme(undefined);
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "metadata-completeness");
    expect(failure).toBeDefined();
    expect(failure?.severity).toBe("error");
  });
});

describe("metadata-completeness: negative — wcagContrast.checked !== true", () => {
  it("produces error when meta.wcagContrast is absent", () => {
    const theme = makeValidTheme({
      author: "wechat-flow",
      // no wcagContrast
    });
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "metadata-completeness");
    expect(failure).toBeDefined();
    expect(failure?.severity).toBe("error");
  });

  it("produces error when meta.wcagContrast.checked is false", () => {
    const theme = makeValidTheme({
      author: "wechat-flow",
      wcagContrast: { checked: false, minRatio: 4.5 },
    });
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "metadata-completeness");
    expect(failure).toBeDefined();
    expect(failure?.severity).toBe("error");
  });
});
