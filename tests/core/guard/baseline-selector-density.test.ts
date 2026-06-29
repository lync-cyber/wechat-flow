import type { ThemeDefinition } from "@wechat-flow/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { validateThemeGuard } from "../../../packages/core/src/guard/index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimum valid tokens satisfying token-coverage (≥60 tokens, all 5 categories). */
function makeMinTokens(): Record<string, string> {
  const tokens: Record<string, string> = {};
  // color — 22 tokens
  tokens["--color-background"] = "#FFFFFF";
  tokens["--color-text-primary"] = "#000000";
  tokens["--color-text-secondary"] = "#333333";
  tokens["--color-link"] = "#0000CC";
  tokens["--color-code-text"] = "#222222";
  tokens["--color-code-bg"] = "#F5F5F5";
  tokens["--color-quote-bg"] = "#F0F0F0";
  tokens["--color-surface"] = "#FFFFFF";
  tokens["--color-surface-alt"] = "#FAFAFA";
  tokens["--color-text-muted"] = "#666666";
  tokens["--color-text-inverse"] = "#FFFFFF";
  tokens["--color-brand"] = "#2D5A4E";
  tokens["--color-brand-light"] = "#3D7A68";
  tokens["--color-brand-dark"] = "#1E3D35";
  tokens["--color-accent"] = "#B94A3E";
  tokens["--color-accent-light"] = "#D45E51";
  tokens["--color-accent-dark"] = "#8F3830";
  tokens["--color-border"] = "#D6D3CE";
  tokens["--color-border-strong"] = "#A8A29E";
  tokens["--color-quote-border"] = "#2D5A4E";
  tokens["--color-hr"] = "#CCCCCC";
  tokens["--color-overlay"] = "#00000080";
  // spacing — 14 tokens
  tokens["--spacing-xs"] = "4px";
  tokens["--spacing-sm"] = "8px";
  tokens["--spacing-md"] = "12px";
  tokens["--spacing-lg"] = "16px";
  tokens["--spacing-xl"] = "24px";
  tokens["--spacing-2xl"] = "32px";
  tokens["--spacing-3xl"] = "48px";
  tokens["--spacing-paragraph-bottom"] = "12px";
  tokens["--spacing-heading-bottom"] = "16px";
  tokens["--spacing-list-item"] = "6px";
  tokens["--spacing-code-inline-h"] = "4px";
  tokens["--spacing-code-inline-v"] = "2px";
  tokens["--spacing-blockquote-h"] = "16px";
  tokens["--spacing-blockquote-v"] = "10px";
  // font — 16 tokens
  tokens["--font-family-body"] = "serif";
  tokens["--font-family-heading"] = "serif";
  tokens["--font-family-mono"] = "monospace";
  tokens["--font-size-base"] = "15px";
  tokens["--font-size-sm"] = "13px";
  tokens["--font-size-lg"] = "17px";
  tokens["--font-size-h1"] = "22px";
  tokens["--font-size-h2"] = "19px";
  tokens["--font-size-h3"] = "17px";
  tokens["--font-size-h4"] = "16px";
  tokens["--font-size-h5"] = "15px";
  tokens["--font-size-h6"] = "14px";
  tokens["--font-weight-normal"] = "400";
  tokens["--font-weight-medium"] = "500";
  tokens["--font-weight-bold"] = "700";
  tokens["--font-line-height-body"] = "1.85";
  // decoration — 6 tokens
  tokens["--decoration-hr-color"] = "#D6D3CE";
  tokens["--decoration-hr-style"] = "solid";
  tokens["--decoration-hr-width"] = "1px";
  tokens["--decoration-border-radius-sm"] = "3px";
  tokens["--decoration-border-radius-md"] = "6px";
  tokens["--decoration-link-underline"] = "underline";
  // alignment — 2 tokens
  tokens["--align-text-body"] = "left";
  tokens["--align-text-heading"] = "left";
  return tokens;
}

/** Baseline blocks covering all 10 required keys. */
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

function makeValidTheme(overrides: Partial<ThemeDefinition> = {}): ThemeDefinition {
  return {
    id: "test-theme",
    name: "Test Theme",
    tokens: makeMinTokens(),
    blocks: BASELINE_BLOCKS,
    assets: {},
    meta: {
      author: "test-author",
      wcagContrast: { checked: true, minRatio: 4.5 },
    },
    templates: [
      {
        themeId: "test-theme",
        templateId: "starter",
        markdown: [
          "# Heading 1",
          "## Heading 2",
          "### Heading 3",
          "#### Heading 4",
          "##### Heading 5",
          "###### Heading 6",
          "",
          "Paragraph text here.",
          "",
          "> Blockquote text",
          "",
          "`inline code`",
          "",
          "---",
          "",
          "- list item",
          "",
          "[link text](https://example.com)",
          "",
          "```\ncode block\n```",
          "",
          "| col1 | col2 |",
          "|------|------|",
          "| a    | b    |",
          "",
          "![alt](https://example.com/img.png)",
          "",
          ":::callout",
          "content",
          ":::",
          "",
          ":::card",
          "content",
          ":::",
          "",
          ":::steps",
          "content",
          ":::",
          "",
          ":::quote",
          "content",
          ":::",
          "",
          ":::pull-quote",
          "content",
          ":::",
          "",
          ":::compare",
          "content",
          ":::",
        ].join("\n"),
        metadata: { description: "starter template" },
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AC-005: baseline-selector-density
// ---------------------------------------------------------------------------

describe("baseline-selector-density: positive — all 10 keys present", () => {
  it("does not produce a baseline-selector-density failure when blocks has all 10 required keys", () => {
    const theme = makeValidTheme();
    const result = validateThemeGuard(theme);
    const failures = result.failures.filter((f) => f.dimension === "baseline-selector-density");
    expect(failures).toHaveLength(0);
  });
});

describe("baseline-selector-density: negative — missing a required block key", () => {
  const REQUIRED_KEYS = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "blockquote", "code", "hr"];

  for (const missingKey of REQUIRED_KEYS) {
    it(`produces error when blocks is missing '${missingKey}'`, () => {
      const blocksWithout = { ...BASELINE_BLOCKS };
      delete (blocksWithout as Record<string, unknown>)[missingKey];
      const theme = makeValidTheme({ blocks: blocksWithout });
      const result = validateThemeGuard(theme);
      const failure = result.failures.find((f) => f.dimension === "baseline-selector-density");
      expect(failure).toBeDefined();
      expect(failure?.severity).toBe("error");
      // message must mention the missing key
      expect(failure?.message).toContain(missingKey);
    });
  }

  it("produces error when theme has no blocks at all", () => {
    const theme = makeValidTheme({ blocks: undefined });
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "baseline-selector-density");
    expect(failure).toBeDefined();
    expect(failure?.severity).toBe("error");
  });
});
