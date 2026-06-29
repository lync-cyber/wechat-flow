import type { ThemeDefinition } from "@wechat-flow/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { validateThemeGuard } from "../../../packages/core/src/guard/index.ts";
import { registerTheme, resetThemeRegistry } from "../../../packages/core/src/registry/theme.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMinTokens(brandColor = "#2D5A4E"): Record<string, string> {
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
  t["--color-brand"] = brandColor;
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

function makeTheme(id: string, brandColor: string): ThemeDefinition {
  return {
    id,
    name: id,
    tokens: makeMinTokens(brandColor),
    blocks: BASELINE_BLOCKS,
    assets: {},
    meta: {
      author: "test-author",
      wcagContrast: { checked: true, minRatio: 4.5 },
    },
    templates: [
      {
        themeId: id,
        templateId: "starter",
        markdown: STARTER_MARKDOWN,
        metadata: { description: "starter" },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// AC-007: cross-theme-identity-token-collision
// ---------------------------------------------------------------------------

describe("cross-theme-identity-token-collision: positive — empty registry vacuously passes", () => {
  beforeEach(() => {
    resetThemeRegistry();
  });

  it("produces no collision failure when no other themes are registered", () => {
    // #2D5A4E is the brand color; no registered themes to collide with
    const theme = makeTheme("my-theme", "#2D5A4E");
    const result = validateThemeGuard(theme);
    const failure = result.failures.find(
      (f) => f.dimension === "cross-theme-identity-token-collision"
    );
    expect(failure).toBeUndefined();
  });
});

describe("cross-theme-identity-token-collision: positive — no --color-brand vacuously passes", () => {
  beforeEach(() => {
    resetThemeRegistry();
    // Register a theme with a very close brand color
    registerTheme(makeTheme("other-theme", "#2D6A5E")); // ΔE ~7.28 from #2D5A4E
  });

  it("produces no collision failure when current theme has no --color-brand token", () => {
    // Omit brand token, add another color token to keep count at 60
    const tokens: Record<string, string> = Object.fromEntries(
      Object.entries(makeMinTokens("#2D5A4E")).filter(([k]) => k !== "--color-brand")
    );
    tokens["--color-extra"] = "#AABBCC";
    const theme: ThemeDefinition = {
      ...makeTheme("no-brand-theme", "#2D5A4E"),
      tokens,
    };
    const result = validateThemeGuard(theme);
    const failure = result.failures.find(
      (f) => f.dimension === "cross-theme-identity-token-collision"
    );
    expect(failure).toBeUndefined();
  });
});

describe("cross-theme-identity-token-collision: negative — ΔE ≤ 10 triggers warning", () => {
  beforeEach(() => {
    resetThemeRegistry();
    // Register a theme whose brand color is #2D6A5E — ΔE_76 ≈ 7.28 from #2D5A4E (≤ 10)
    registerTheme(makeTheme("other-green", "#2D6A5E"));
  });

  it("produces a warning when current theme brand color has ΔE_76 ≤ 10 with a registered theme", () => {
    // #2D5A4E vs #2D6A5E → ΔE_76 ≈ 7.28 (≤ 10 → collision)
    const theme = makeTheme("my-green", "#2D5A4E");
    const result = validateThemeGuard(theme);
    const failure = result.failures.find(
      (f) => f.dimension === "cross-theme-identity-token-collision"
    );
    expect(failure).toBeDefined();
    expect(failure?.severity).toBe("warning");
  });

  it("warning message contains the colliding theme id", () => {
    const theme = makeTheme("my-green", "#2D5A4E");
    const result = validateThemeGuard(theme);
    const failure = result.failures.find(
      (f) => f.dimension === "cross-theme-identity-token-collision"
    );
    // message must name the colliding theme
    expect(failure?.message).toContain("other-green");
  });

  it("warning message contains the actual ΔE value", () => {
    const theme = makeTheme("my-green", "#2D5A4E");
    const result = validateThemeGuard(theme);
    const failure = result.failures.find(
      (f) => f.dimension === "cross-theme-identity-token-collision"
    );
    // message should contain a numeric ΔE value
    expect(failure?.message).toMatch(/\d+\.?\d*/);
  });
});

describe("cross-theme-identity-token-collision: positive — ΔE > 10 is distinct", () => {
  beforeEach(() => {
    resetThemeRegistry();
    // Register a theme with an orange brand color — very different from green
    // #D4521A vs #2D5A4E → ΔE_76 ≈ 87.59 (> 10 → no collision)
    registerTheme(makeTheme("orange-theme", "#D4521A"));
  });

  it("produces no collision warning when ΔE > 10 between brand colors", () => {
    const theme = makeTheme("green-theme", "#2D5A4E");
    const result = validateThemeGuard(theme);
    const failure = result.failures.find(
      (f) => f.dimension === "cross-theme-identity-token-collision"
    );
    expect(failure).toBeUndefined();
  });
});
