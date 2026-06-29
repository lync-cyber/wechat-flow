import { beforeEach, describe, expect, it } from "vitest";
import { validateThemeGuard } from "../../packages/core/src/guard/index.ts";
import {
  describeTheme,
  listThemes,
  registerTheme,
  resetThemeRegistry,
} from "../../packages/core/src/registry/theme.ts";

beforeEach(() => {
  resetThemeRegistry();
});

describe("AC-001: registerTheme / listThemes", () => {
  it("listThemes contains the registered theme id and name", () => {
    registerTheme({ id: "test", name: "测试", tokens: { "--color-brand": "#123" } });
    const themes = listThemes();
    const entry = themes.find((t) => t.id === "test");
    expect(entry).toBeDefined();
    expect(entry?.name).toBe("测试");
  });

  it("listThemes does not include tokens field", () => {
    registerTheme({ id: "test", name: "测试", tokens: { "--color-brand": "#123" } });
    const themes = listThemes();
    const entry = themes.find((t) => t.id === "test");
    expect(entry).not.toHaveProperty("tokens");
  });
});

describe("AC-002: describeTheme returns full definition", () => {
  it("returns tokens, paintable, assets fields", () => {
    registerTheme({ id: "test", name: "测试", tokens: { "--color-brand": "#123" } });
    const def = describeTheme("test");
    expect(def).toBeDefined();
    expect(def?.tokens).toEqual({ "--color-brand": "#123" });
    expect(def).toHaveProperty("paintable");
    expect(def).toHaveProperty("assets");
  });

  it("returns undefined for unknown id", () => {
    const def = describeTheme("no-such-theme");
    expect(def).toBeUndefined();
  });
});

describe("AC-003: validateThemeGuard passes for compliant theme", () => {
  it("returns passed=true and empty failures for a theme with wcag-contrast metadata", () => {
    const BLOCKS = {
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
    const TOKENS: Record<string, string> = {
      "--color-background": "#FFFFFF",
      "--color-text-primary": "#000000",
      "--color-text-secondary": "#333333",
      "--color-link": "#0000CC",
      "--color-code-text": "#222222",
      "--color-code-bg": "#F5F5F5",
      "--color-quote-bg": "#F0F0F0",
      "--color-surface": "#FFFFFF",
      "--color-surface-alt": "#FAFAFA",
      "--color-text-muted": "#666666",
      "--color-text-inverse": "#FFFFFF",
      "--color-brand": "#005fcc",
      "--color-brand-light": "#3D7A68",
      "--color-brand-dark": "#1E3D35",
      "--color-accent": "#B94A3E",
      "--color-accent-light": "#D45E51",
      "--color-accent-dark": "#8F3830",
      "--color-border": "#D6D3CE",
      "--color-border-strong": "#A8A29E",
      "--color-quote-border": "#2D5A4E",
      "--color-hr": "#CCCCCC",
      "--color-overlay": "#00000080",
      "--spacing-xs": "4px",
      "--spacing-sm": "8px",
      "--spacing-md": "12px",
      "--spacing-lg": "16px",
      "--spacing-xl": "24px",
      "--spacing-2xl": "32px",
      "--spacing-3xl": "48px",
      "--spacing-paragraph-bottom": "12px",
      "--spacing-heading-bottom": "16px",
      "--spacing-list-item": "6px",
      "--spacing-code-inline-h": "4px",
      "--spacing-code-inline-v": "2px",
      "--spacing-blockquote-h": "16px",
      "--spacing-blockquote-v": "10px",
      "--font-family-body": "serif",
      "--font-family-heading": "serif",
      "--font-family-mono": "monospace",
      "--font-size-base": "15px",
      "--font-size-sm": "13px",
      "--font-size-lg": "17px",
      "--font-size-h1": "22px",
      "--font-size-h2": "19px",
      "--font-size-h3": "17px",
      "--font-size-h4": "16px",
      "--font-size-h5": "15px",
      "--font-size-h6": "14px",
      "--font-weight-normal": "400",
      "--font-weight-medium": "500",
      "--font-weight-bold": "700",
      "--font-line-height-body": "1.85",
      "--decoration-hr-color": "#D6D3CE",
      "--decoration-hr-style": "solid",
      "--decoration-hr-width": "1px",
      "--decoration-border-radius-sm": "3px",
      "--decoration-border-radius-md": "6px",
      "--decoration-link-underline": "underline",
      "--align-text-body": "left",
      "--align-text-heading": "left",
    };
    const STARTER_MD = [
      "# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6",
      "\nParagraph.\n\n> Blockquote\n\n`code`\n\n---\n\n- list\n\n[link](https://example.com)",
      "\n```\nblock\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n![img](https://example.com/img.png)",
      "\n:::callout\nx\n:::\n:::card\nx\n:::\n:::steps\nx\n:::\n:::quote\nx\n:::\n:::pull-quote\nx\n:::\n:::compare\nx\n:::",
    ].join("");
    const theme = {
      id: "compliant",
      name: "合规主题",
      tokens: TOKENS,
      blocks: BLOCKS,
      paintable: {},
      assets: {},
      meta: { author: "test", wcagContrast: { checked: true, minRatio: 4.5 } },
      templates: [
        {
          themeId: "compliant",
          templateId: "starter",
          markdown: STARTER_MD,
          metadata: { description: "starter" },
        },
      ],
    };
    const result = validateThemeGuard(theme);
    expect(result.passed).toBe(true);
    expect(result.failures).toEqual([]);
  });
});

describe("AC-004: validateThemeGuard fails for theme missing wcag-contrast", () => {
  it("failures contains dimension wcag-contrast with severity error", () => {
    const theme = {
      id: "bad",
      name: "缺对比度主题",
      tokens: { "--color-brand": "#123" },
      paintable: {},
      assets: {},
      meta: { author: "test" },
    };
    const result = validateThemeGuard(theme);
    const wcagFailure = result.failures.find((f) => f.dimension === "wcag-contrast");
    expect(wcagFailure).toBeDefined();
    expect(wcagFailure?.severity).toBe("error");
  });
});
