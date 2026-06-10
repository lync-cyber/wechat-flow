import { describe, expect, it } from "vitest";
import { validateThemeGuard } from "../../packages/core/src/guard/eight-dimensions.ts";
import { renderMarkdown } from "../../packages/core/src/index.ts";
import defaultTheme from "../../packages/themes/default/src/index.ts";

describe("AC-001: defaultTheme passes validateThemeGuard with no CRITICAL failures", () => {
  it("validateThemeGuard(defaultTheme).passed === true", () => {
    const result = validateThemeGuard(defaultTheme);
    expect(result.passed).toBe(true);
  });

  it("validateThemeGuard(defaultTheme) has no CRITICAL-level failures (error severity)", () => {
    const result = validateThemeGuard(defaultTheme);
    const criticalFailures = result.failures.filter((f) => f.severity === "error");
    expect(criticalFailures).toHaveLength(0);
  });
});

describe("AC-002: defaultTheme.tokens has ≥ 60 tokens covering 5 categories", () => {
  it("token count is at least 60", () => {
    const count = Object.keys(defaultTheme.tokens).length;
    expect(count).toBeGreaterThanOrEqual(60);
  });

  it("covers color category (tokens with --color- prefix)", () => {
    const colorTokens = Object.keys(defaultTheme.tokens).filter((k) => k.startsWith("--color-"));
    expect(colorTokens.length).toBeGreaterThan(0);
  });

  it("covers spacing category (tokens with --spacing- prefix)", () => {
    const spacingTokens = Object.keys(defaultTheme.tokens).filter((k) =>
      k.startsWith("--spacing-")
    );
    expect(spacingTokens.length).toBeGreaterThan(0);
  });

  it("covers font category (tokens with --font- prefix)", () => {
    const fontTokens = Object.keys(defaultTheme.tokens).filter((k) => k.startsWith("--font-"));
    expect(fontTokens.length).toBeGreaterThan(0);
  });

  it("covers decoration category (tokens with --decoration- prefix)", () => {
    const decorationTokens = Object.keys(defaultTheme.tokens).filter((k) =>
      k.startsWith("--decoration-")
    );
    expect(decorationTokens.length).toBeGreaterThan(0);
  });

  it("covers alignment category (tokens with --align- prefix)", () => {
    const alignTokens = Object.keys(defaultTheme.tokens).filter((k) => k.startsWith("--align-"));
    expect(alignTokens.length).toBeGreaterThan(0);
  });
});

describe("AC-003: renderMarkdown with defaultTheme produces styled h1 with no var(-- residue", () => {
  it("h1 element has a non-empty style attribute", async () => {
    const result = await renderMarkdown("# Hello\n\n**bold** text", { theme: defaultTheme });
    expect(result.html).toMatch(/<h1[^>]+style="[^"]+"/);
  });

  it("produced html contains no var(-- references (tokens resolved at build time)", async () => {
    const result = await renderMarkdown("# Hello\n\n**bold** text", { theme: defaultTheme });
    expect(result.html).not.toMatch(/var\(--/);
  });

  it("themeVersion propagates from theme.meta.version when theme is provided", async () => {
    const result = await renderMarkdown("# Hello", { theme: defaultTheme });
    expect(result.themeVersion).toBe(defaultTheme.meta?.version ?? "0.0.0");
    expect(result.themeVersion).not.toBe("0.0.0");
  });
});
