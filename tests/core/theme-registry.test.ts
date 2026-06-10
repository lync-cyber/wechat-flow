import { beforeEach, describe, expect, it } from "vitest";
import { validateThemeGuard } from "../../packages/core/src/guard/eight-dimensions.ts";
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
    const theme = {
      id: "compliant",
      name: "合规主题",
      tokens: { "--color-brand": "#005fcc" },
      paintable: {},
      assets: {},
      meta: {
        author: "test",
        wcagContrast: { checked: true, minRatio: 4.5 },
      },
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
