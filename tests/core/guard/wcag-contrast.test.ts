import type { ThemeDefinition } from "@wechat-flow/contracts";
import { describe, expect, it } from "vitest";
import { validateThemeGuard } from "../../../packages/core/src/guard/index.ts";

// ---------------------------------------------------------------------------
// WCAG 2.1 contrast reference values (pre-computed):
//
// Contrast formula: (L_lighter + 0.05) / (L_darker + 0.05)
// Linearize: c <= 0.04045 → c/12.92; else ((c+0.055)/1.055)^2.4
// L = 0.2126*R_lin + 0.7152*G_lin + 0.0722*B_lin
//
// #000000 vs #FFFFFF → 21.00  (passes 4.5)
// #1C1917 vs #FAF8F5 → 16.50  (passes 4.5)
// #333333 vs #FFFFFF → 12.63  (passes 4.5)
// #292524 vs #F0EDE8 → 12.99  (passes 4.5)
// #777777 vs #FFFFFF →  4.478 (FAILS 4.5)
// #D4521A vs #FFFBF7 →  4.06  (FAILS 4.5 — magazine defect)
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
  "\nParagraph.\n\n> Blockquote\n\n`code`\n\n---\n\n- list\n\n[link](https://example.com)",
  "\n```\nblock\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n![img](https://example.com/img.png)",
  "\n:::callout\nx\n:::\n:::card\nx\n:::\n:::steps\nx\n:::\n:::quote\nx\n:::\n:::pull-quote\nx\n:::\n:::compare\nx\n:::",
].join("");

/** Build the structural part of a theme (non-token fields). */
function makeThemeBase(tokenOverride: Record<string, string>): ThemeDefinition {
  return {
    id: "test-theme",
    name: "Test Theme",
    tokens: tokenOverride,
    blocks: BASELINE_BLOCKS,
    assets: {},
    meta: {
      author: "test-author",
      // Note: wcagContrast.checked = true satisfies metadata-completeness.
      // The wcag-contrast dimension independently verifies actual colors.
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

/** Tokens where all 5 key color pairs exceed contrast ratio 4.5. */
function makeHighContrastTokens(): Record<string, string> {
  const t: Record<string, string> = {};
  // All 5 required pairs use high-contrast values:
  // (a) text-primary vs background: #000000 vs #FFFFFF → 21.00
  // (b) text-secondary vs background: #333333 vs #FFFFFF → 12.63
  // (c) link vs background: #0000CC vs #FFFFFF → 8.59
  // (d) code-text vs code-bg: #000000 vs #F5F5F5 → 19.56
  // (e) text-secondary vs quote-bg: #333333 vs #F0F0F0 → 11.57
  t["--color-background"] = "#FFFFFF";
  t["--color-text-primary"] = "#000000";
  t["--color-text-secondary"] = "#333333";
  t["--color-link"] = "#0000CC";
  t["--color-code-text"] = "#000000";
  t["--color-code-bg"] = "#F5F5F5";
  t["--color-quote-bg"] = "#F0F0F0";
  // Additional tokens to reach 60 and cover all categories:
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

// ---------------------------------------------------------------------------
// AC-002: wcag-contrast
// ---------------------------------------------------------------------------

describe("wcag-contrast: positive — all 5 color pairs above 4.5", () => {
  it("does not produce a wcag-contrast failure when all key pairs have contrast ≥ 4.5", () => {
    const theme = makeThemeBase(makeHighContrastTokens());
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "wcag-contrast");
    expect(failure).toBeUndefined();
  });
});

describe("wcag-contrast: negative — text-primary vs background below 4.5", () => {
  it("produces error when --color-text-primary vs --color-background contrast < 4.5", () => {
    // #777777 vs #FFFFFF → contrast ≈ 4.478 < 4.5
    const tokens = { ...makeHighContrastTokens(), "--color-text-primary": "#777777" };
    const theme = makeThemeBase(tokens);
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "wcag-contrast");
    expect(failure).toBeDefined();
    expect(failure?.severity).toBe("error");
  });
});

describe("wcag-contrast: negative — link vs background below 4.5 (magazine defect)", () => {
  it("produces error when --color-link (#D4521A) vs --color-background (#FFFBF7) contrast ≈ 4.06 < 4.5", () => {
    // This mirrors the real magazine theme defect: link color #D4521A on background #FFFBF7
    const tokens = {
      ...makeHighContrastTokens(),
      "--color-background": "#FFFBF7",
      "--color-link": "#D4521A",
      // Reset text-secondary vs quote-bg using white quote-bg to ensure only link pair fails
      "--color-quote-bg": "#FFFFFF",
    };
    const theme = makeThemeBase(tokens);
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "wcag-contrast");
    expect(failure).toBeDefined();
    expect(failure?.severity).toBe("error");
    // message should mention the failing color pair tokens or values
    expect(failure?.message).toMatch(/color-link|D4521A|4\.0/i);
  });
});

describe("wcag-contrast: negative — code-text vs code-bg below 4.5", () => {
  it("produces error when --color-code-text vs --color-code-bg contrast < 4.5", () => {
    // #777777 vs #FFFFFF → ≈ 4.478 < 4.5
    const tokens = {
      ...makeHighContrastTokens(),
      "--color-code-text": "#777777",
      "--color-code-bg": "#FFFFFF",
    };
    const theme = makeThemeBase(tokens);
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "wcag-contrast");
    expect(failure).toBeDefined();
    expect(failure?.severity).toBe("error");
  });
});

describe("wcag-contrast: negative — text-secondary vs quote-bg below 4.5", () => {
  it("produces error when --color-text-secondary vs --color-quote-bg contrast < 4.5", () => {
    // #777777 vs #FFFFFF → ≈ 4.478 < 4.5 (quote-bg white, text-secondary gray)
    const tokens = {
      ...makeHighContrastTokens(),
      "--color-text-secondary": "#777777",
      "--color-quote-bg": "#FFFFFF",
    };
    const theme = makeThemeBase(tokens);
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "wcag-contrast");
    expect(failure).toBeDefined();
    expect(failure?.severity).toBe("error");
  });
});

describe("wcag-contrast: negative — missing required color token treated as violation", () => {
  it("produces error when --color-text-primary token is absent", () => {
    // Omit text-primary, add an extra spacing token to maintain count=60
    const tokens: Record<string, string> = Object.fromEntries(
      Object.entries(makeHighContrastTokens()).filter(([k]) => k !== "--color-text-primary")
    );
    tokens["--spacing-extra"] = "1px";
    const theme = makeThemeBase(tokens);
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "wcag-contrast");
    expect(failure).toBeDefined();
    expect(failure?.severity).toBe("error");
  });

  it("produces error when --color-background token is absent", () => {
    const tokens: Record<string, string> = Object.fromEntries(
      Object.entries(makeHighContrastTokens()).filter(([k]) => k !== "--color-background")
    );
    tokens["--spacing-extra"] = "1px";
    const theme = makeThemeBase(tokens);
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "wcag-contrast");
    expect(failure).toBeDefined();
    expect(failure?.severity).toBe("error");
  });
});

describe("wcag-contrast: error message lists violating pair", () => {
  it("error message contains the violating pair token names or contrast value", () => {
    const tokens = { ...makeHighContrastTokens(), "--color-text-primary": "#777777" };
    const theme = makeThemeBase(tokens);
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "wcag-contrast");
    // message must contain the actual numeric contrast ratio or token names
    expect(failure?.message).toMatch(/4\.\d+|text-primary|777/i);
  });
});
