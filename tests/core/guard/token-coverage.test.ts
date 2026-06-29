import type { ThemeDefinition } from "@wechat-flow/contracts";
import { describe, expect, it } from "vitest";
import { validateThemeGuard } from "../../../packages/core/src/guard/index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  "\nParagraph.\n",
  "> Blockquote\n",
  "`code`\n\n---\n\n- list\n\n[link](https://example.com)\n\n```\nblock\n```",
  "\n| a | b |\n|---|---|\n| 1 | 2 |\n\n![img](https://example.com/img.png)",
  "\n:::callout\nx\n:::\n:::card\nx\n:::\n:::steps\nx\n:::\n:::quote\nx\n:::\n:::pull-quote\nx\n:::\n:::compare\nx\n:::",
].join("");

const FULL_TEMPLATE = {
  themeId: "test-theme",
  templateId: "starter",
  markdown: STARTER_MARKDOWN,
  metadata: { description: "starter" },
};

/** 60 tokens across all 5 categories satisfying AC-003. */
function make60Tokens(): Record<string, string> {
  const tokens: Record<string, string> = {};
  // color — 22
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
  // spacing — 14
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
  // font — 16
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
  // decoration — 6
  tokens["--decoration-hr-color"] = "#D6D3CE";
  tokens["--decoration-hr-style"] = "solid";
  tokens["--decoration-hr-width"] = "1px";
  tokens["--decoration-border-radius-sm"] = "3px";
  tokens["--decoration-border-radius-md"] = "6px";
  tokens["--decoration-link-underline"] = "underline";
  // alignment — 2
  tokens["--align-text-body"] = "left";
  tokens["--align-text-heading"] = "left";
  return tokens;
}

function makeValidTheme(tokenOverride?: Record<string, string>): ThemeDefinition {
  return {
    id: "test-theme",
    name: "Test Theme",
    tokens: tokenOverride ?? make60Tokens(),
    blocks: BASELINE_BLOCKS,
    assets: {},
    meta: {
      author: "test-author",
      wcagContrast: { checked: true, minRatio: 4.5 },
    },
    templates: [{ ...FULL_TEMPLATE, themeId: "test-theme" }],
  };
}

// ---------------------------------------------------------------------------
// AC-003: token-coverage
// ---------------------------------------------------------------------------

describe("token-coverage: positive — 60 tokens with all 5 categories", () => {
  it("does not produce a token-coverage failure when tokens has 60 keys across all 5 categories", () => {
    const tokens = make60Tokens();
    expect(Object.keys(tokens).length).toBe(60);
    const theme = makeValidTheme(tokens);
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "token-coverage");
    expect(failure).toBeUndefined();
  });
});

describe("token-coverage: negative — fewer than 60 tokens", () => {
  it("produces an error when token count is 59 (< 60)", () => {
    const tokens = make60Tokens();
    // Remove one token to get 59
    const keys = Object.keys(tokens);
    delete (tokens as Record<string, string>)[keys[keys.length - 1]];
    expect(Object.keys(tokens).length).toBe(59);

    const theme = makeValidTheme(tokens);
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "token-coverage");
    expect(failure).toBeDefined();
    expect(failure?.severity).toBe("error");
  });

  it("error message contains actual token count", () => {
    const tokens = make60Tokens();
    const keys = Object.keys(tokens);
    delete (tokens as Record<string, string>)[keys[keys.length - 1]];

    const theme = makeValidTheme(tokens);
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "token-coverage");
    // message must mention "59" (the actual count)
    expect(failure?.message).toContain("59");
  });
});

describe("token-coverage: negative — missing a required category", () => {
  it("produces an error when --align- category is missing (even with 60 tokens)", () => {
    // Remove both align tokens, add 2 extra colors to keep count at 60
    const tokens: Record<string, string> = Object.fromEntries(
      Object.entries(make60Tokens()).filter(
        ([k]) => k !== "--align-text-body" && k !== "--align-text-heading"
      )
    );
    tokens["--color-extra-1"] = "#111111";
    tokens["--color-extra-2"] = "#222222";
    expect(Object.keys(tokens).length).toBe(60);

    const theme = makeValidTheme(tokens);
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "token-coverage");
    expect(failure).toBeDefined();
    expect(failure?.severity).toBe("error");
    // message should mention the missing category
    expect(failure?.message).toMatch(/align/i);
  });

  it("produces an error when --decoration- category is missing (even with 60 tokens)", () => {
    const tokens = make60Tokens();
    // Remove all 6 decoration tokens, replace with 6 extra spacings
    for (const key of [
      "--decoration-hr-color",
      "--decoration-hr-style",
      "--decoration-hr-width",
      "--decoration-border-radius-sm",
      "--decoration-border-radius-md",
      "--decoration-link-underline",
    ]) {
      delete (tokens as Record<string, string>)[key];
    }
    for (let i = 0; i < 6; i++) {
      tokens[`--spacing-extra-${i}`] = "1px";
    }
    expect(Object.keys(tokens).length).toBe(60);

    const theme = makeValidTheme(tokens);
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "token-coverage");
    expect(failure).toBeDefined();
    expect(failure?.severity).toBe("error");
    expect(failure?.message).toMatch(/decoration/i);
  });
});
