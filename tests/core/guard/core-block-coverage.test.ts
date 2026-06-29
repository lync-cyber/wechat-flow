import type { ThemeDefinition } from "@wechat-flow/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { validateThemeGuard } from "../../../packages/core/src/guard/index.ts";
import { registerBlock, resetBlockRegistry } from "../../../packages/core/src/registry/block.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMinTokens(): Record<string, string> {
  const tokens: Record<string, string> = {};
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
  tokens["--decoration-hr-color"] = "#D6D3CE";
  tokens["--decoration-hr-style"] = "solid";
  tokens["--decoration-hr-width"] = "1px";
  tokens["--decoration-border-radius-sm"] = "3px";
  tokens["--decoration-border-radius-md"] = "6px";
  tokens["--decoration-link-underline"] = "underline";
  tokens["--align-text-body"] = "left";
  tokens["--align-text-heading"] = "left";
  return tokens;
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
  "# H1",
  "## H2",
  "### H3",
  "#### H4",
  "##### H5",
  "###### H6",
  "",
  "Paragraph.",
  "",
  "> Blockquote",
  "",
  "`code`",
  "",
  "---",
  "",
  "- list item",
  "",
  "[link](https://example.com)",
  "",
  "```\ncode block\n```",
  "",
  "| col1 | col2 |",
  "|------|------|",
  "| a    | b    |",
  "",
  "![alt](https://example.com/img.png)",
  "",
  ":::callout\ncontent\n:::",
  ":::card\ncontent\n:::",
  ":::steps\ncontent\n:::",
  ":::quote\ncontent\n:::",
  ":::pull-quote\ncontent\n:::",
  ":::compare\ncontent\n:::",
].join("\n");

function makeValidTheme(
  blockOverride?: Record<string, Record<string, Record<string, string>>>
): ThemeDefinition {
  return {
    id: "test-theme",
    name: "Test Theme",
    tokens: makeMinTokens(),
    blocks: blockOverride ?? BASELINE_BLOCKS,
    assets: {},
    meta: {
      author: "test-author",
      wcagContrast: { checked: true, minRatio: 4.5 },
    },
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

function makeBlock(id: string) {
  return {
    id,
    name: id,
    attrsSchema: z.object({}),
    variants: [],
    baseStyle: { root: {} },
    slots: ["root"],
  };
}

// ---------------------------------------------------------------------------
// AC-006: core-block-coverage
// ---------------------------------------------------------------------------

describe("core-block-coverage: positive — registry empty → vacuously pass", () => {
  beforeEach(() => {
    resetBlockRegistry();
    // Do NOT register any blocks — empty registry should vacuously pass
  });

  it("produces no core-block-coverage failure when block registry is empty", () => {
    const theme = makeValidTheme();
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "core-block-coverage");
    expect(failure).toBeUndefined();
  });
});

describe("core-block-coverage: negative — coverage < 50% with non-empty registry", () => {
  beforeEach(() => {
    resetBlockRegistry();
    // Register 10 blocks: callout, card, steps, quote, pull-quote, compare + 4 extras
    for (const id of [
      "callout",
      "card",
      "steps",
      "quote",
      "pull-quote",
      "compare",
      "banner",
      "alert",
      "notice",
      "tip",
    ]) {
      registerBlock(makeBlock(id));
    }
  });

  it("produces a warning when theme.blocks covers < 50% of registered block ids", () => {
    // theme.blocks only has baseline typography keys (h1-h6, p, blockquote, code, hr),
    // none of which match the registered block ids — coverage = 0/10 = 0% < 50%
    const theme = makeValidTheme(BASELINE_BLOCKS);
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "core-block-coverage");
    expect(failure).toBeDefined();
    expect(failure?.severity).toBe("warning");
  });

  it("warning message contains coverage rate information", () => {
    const theme = makeValidTheme(BASELINE_BLOCKS);
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "core-block-coverage");
    // message should mention coverage percentage or ratio
    expect(failure?.message).toBeDefined();
    expect(failure?.message?.length).toBeGreaterThan(0);
  });
});

describe("core-block-coverage: positive — theme covers ≥50% of registered blocks", () => {
  beforeEach(() => {
    resetBlockRegistry();
    // Register exactly 4 blocks, theme will cover 3 of them (75%)
    for (const id of ["callout", "card", "steps", "quote"]) {
      registerBlock(makeBlock(id));
    }
  });

  it("does not produce core-block-coverage warning when coverage ≥ 50%", () => {
    // Add callout, card, steps to blocks (3 of 4 registered = 75%)
    const blocks = {
      ...BASELINE_BLOCKS,
      callout: { root: { color: "#333" } },
      card: { root: { color: "#333" } },
      steps: { root: { color: "#333" } },
    };
    const theme = makeValidTheme(blocks);
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "core-block-coverage");
    expect(failure).toBeUndefined();
  });
});
