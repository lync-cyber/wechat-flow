import { beforeEach, describe, expect, it } from "vitest";
import { validateThemeGuard } from "../../packages/core/src/guard/eight-dimensions.ts";
import { renderMarkdown } from "../../packages/core/src/index.ts";
import {
  listThemes,
  registerTheme,
  resetThemeRegistry,
} from "../../packages/core/src/registry/theme.ts";
import businessTheme from "../../packages/themes/business/src/index.ts";
import defaultTheme from "../../packages/themes/default/src/index.ts";
import literaryTheme from "../../packages/themes/literary/src/index.ts";
import magazineTheme from "../../packages/themes/magazine/src/index.ts";
import techTheme from "../../packages/themes/tech/src/index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** WCAG 2.1 relative luminance of a hex color. */
function relativeLuminance(hex: string): number {
  const clean = hex.replace(/^#/, "");
  const r = Number.parseInt(clean.slice(0, 2), 16) / 255;
  const g = Number.parseInt(clean.slice(2, 4), 16) / 255;
  const b = Number.parseInt(clean.slice(4, 6), 16) / 255;
  const linearize = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** Extract the value of a CSS property from an inline style string. */
function extractCssProp(style: string, prop: string): string | undefined {
  const match = new RegExp(`${prop}\\s*:\\s*([^;]+)`).exec(style);
  return match ? match[1].trim() : undefined;
}

/** Extract the style attribute from the first <pre> element in an HTML string. */
function extractFirstPreStyle(html: string): string {
  const match = /<pre[^>]+style="([^"]+)"/.exec(html);
  if (!match) {
    throw new Error("No <pre> element with style found in rendered HTML");
  }
  return match[1];
}

// ---------------------------------------------------------------------------
// AC-001: 四套新主题通过 validateThemeGuard
// ---------------------------------------------------------------------------

describe("AC-001: magazine / literary / business / tech 主题通过 validateThemeGuard", () => {
  it("magazineTheme: validateThemeGuard passed === true", () => {
    const result = validateThemeGuard(magazineTheme);
    expect(result.passed).toBe(true);
  });

  it("magazineTheme: 无 CRITICAL (error) 级别 failures", () => {
    const result = validateThemeGuard(magazineTheme);
    const criticals = result.failures.filter((f) => f.severity === "error");
    expect(criticals).toHaveLength(0);
  });

  it("literaryTheme: validateThemeGuard passed === true", () => {
    const result = validateThemeGuard(literaryTheme);
    expect(result.passed).toBe(true);
  });

  it("literaryTheme: 无 CRITICAL (error) 级别 failures", () => {
    const result = validateThemeGuard(literaryTheme);
    const criticals = result.failures.filter((f) => f.severity === "error");
    expect(criticals).toHaveLength(0);
  });

  it("businessTheme: validateThemeGuard passed === true", () => {
    const result = validateThemeGuard(businessTheme);
    expect(result.passed).toBe(true);
  });

  it("businessTheme: 无 CRITICAL (error) 级别 failures", () => {
    const result = validateThemeGuard(businessTheme);
    const criticals = result.failures.filter((f) => f.severity === "error");
    expect(criticals).toHaveLength(0);
  });

  it("techTheme: validateThemeGuard passed === true", () => {
    const result = validateThemeGuard(techTheme);
    expect(result.passed).toBe(true);
  });

  it("techTheme: 无 CRITICAL (error) 级别 failures", () => {
    const result = validateThemeGuard(techTheme);
    const criticals = result.failures.filter((f) => f.severity === "error");
    expect(criticals).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// AC-002: tech 主题代码块暗底 + 等宽字体
// ---------------------------------------------------------------------------

describe("AC-002: tech 主题代码块 background-color luminance 差值 ≥ 0.4 且含等宽字体", () => {
  const CODE_MARKDOWN = "```js\nconsole.log('hello');\n```";

  it("tech 代码块 background-color 与 default 代码块 background-color 的 luminance 差值 ≥ 0.4", async () => {
    const defaultResult = await renderMarkdown(CODE_MARKDOWN, { theme: defaultTheme });
    const techResult = await renderMarkdown(CODE_MARKDOWN, { theme: techTheme });

    const defaultPreStyle = extractFirstPreStyle(defaultResult.html);
    const techPreStyle = extractFirstPreStyle(techResult.html);

    const defaultBg = extractCssProp(defaultPreStyle, "background-color");
    const techBg = extractCssProp(techPreStyle, "background-color");

    if (!defaultBg) throw new Error("default theme <pre> has no background-color");
    if (!techBg) throw new Error("tech theme <pre> has no background-color");

    const defaultLuminance = relativeLuminance(defaultBg);
    const techLuminance = relativeLuminance(techBg);
    const diff = Math.abs(defaultLuminance - techLuminance);

    expect(diff).toBeGreaterThanOrEqual(0.4);
  });

  it("tech 代码块 font-family 含等宽字体族（mono|consolas|menlo|sf mono|courier）", async () => {
    const techResult = await renderMarkdown(CODE_MARKDOWN, { theme: techTheme });
    const techPreStyle = extractFirstPreStyle(techResult.html);
    const fontFamily = extractCssProp(techPreStyle, "font-family");

    if (!fontFamily) throw new Error("tech theme <pre> has no font-family");

    expect(fontFamily).toMatch(/mono|consolas|menlo|sf mono|courier/i);
  });
});

// ---------------------------------------------------------------------------
// AC-003: 五套主题注册到注册中心后 listThemes 返回 ≥ 5 且含全部 id
// ---------------------------------------------------------------------------

describe("AC-003: 五套主题注册后 listThemes 返回 ≥ 5 条且含全部预期 id", () => {
  beforeEach(() => {
    resetThemeRegistry();
    for (const theme of [defaultTheme, magazineTheme, literaryTheme, businessTheme, techTheme]) {
      registerTheme(theme);
    }
  });

  it("listThemes() 长度 ≥ 5", () => {
    const themes = listThemes();
    expect(themes.length).toBeGreaterThanOrEqual(5);
  });

  it("listThemes() 含 id='default'", () => {
    const ids = listThemes().map((t) => t.id);
    expect(ids).toContain("default");
  });

  it("listThemes() 含 id='magazine'", () => {
    const ids = listThemes().map((t) => t.id);
    expect(ids).toContain("magazine");
  });

  it("listThemes() 含 id='literary'", () => {
    const ids = listThemes().map((t) => t.id);
    expect(ids).toContain("literary");
  });

  it("listThemes() 含 id='business'", () => {
    const ids = listThemes().map((t) => t.id);
    expect(ids).toContain("business");
  });

  it("listThemes() 含 id='tech'", () => {
    const ids = listThemes().map((t) => t.id);
    expect(ids).toContain("tech");
  });
});

// ---------------------------------------------------------------------------
// AC-004: 五套主题 --color-brand 值各不相同（防碰撞）
// ---------------------------------------------------------------------------

describe("AC-004: 五套主题 --color-brand token 值各不相同", () => {
  const ALL_THEMES = [defaultTheme, magazineTheme, literaryTheme, businessTheme, techTheme];

  it("五套主题的 --color-brand 均为非空字符串", () => {
    for (const theme of ALL_THEMES) {
      const brand = theme.tokens["--color-brand"];
      expect(typeof brand).toBe("string");
      expect((brand as string).length).toBeGreaterThan(0);
    }
  });

  it("五套主题的 --color-brand 值无重复（Set 大小 === 5）", () => {
    const brandValues = ALL_THEMES.map((t) => t.tokens["--color-brand"]);
    const unique = new Set(brandValues);
    expect(unique.size).toBe(5);
  });
});
