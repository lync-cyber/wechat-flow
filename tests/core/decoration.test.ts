import { beforeEach, describe, expect, it } from "vitest";
import {
  injectDecorations,
  renderMarkdown,
  resetThemeRegistry,
  resolveTokenPlaceholders,
} from "../../packages/core/src/index.ts";
import { registerTheme } from "../../packages/core/src/registry/theme.ts";
import { defaultAssets } from "../../packages/themes/default/src/assets/index.ts";

const MINIMAL_BLOCKS = {
  h1: { default: { "font-size": "22px" } },
  h2: { default: { "font-size": "18px" } },
  p: { default: { "font-size": "15px" } },
};

function makeDecoratedTheme(id: string, assets: Record<string, string>) {
  return {
    id,
    name: "Test Decorated",
    tokens: { "--color-brand": "#2D5A4E" },
    blocks: MINIMAL_BLOCKS,
    assets,
  };
}

beforeEach(() => {
  resetThemeRegistry();
});

describe("resolveTokenPlaceholders: direct unit tests", () => {
  it("replaces {{color.brand}} with seeded token value #2D5A4E", () => {
    const result = resolveTokenPlaceholders('fill="{{color.brand}}"');
    expect(result).toBe('fill="#2D5A4E"');
    expect(result).not.toContain("{{");
  });

  it("replaces {{color.accent}} with seeded token value #B94A3E", () => {
    const result = resolveTokenPlaceholders('fill="{{color.accent}}"');
    expect(result).toBe('fill="#B94A3E"');
  });

  it("replaces {{color.text-primary}} with seeded token value #1C1917", () => {
    const result = resolveTokenPlaceholders('fill="{{color.text-primary}}"');
    expect(result).toBe('fill="#1C1917"');
  });

  it("leaves unknown token placeholder unchanged", () => {
    const result = resolveTokenPlaceholders('fill="{{unknown.token.xyz}}"');
    expect(result).toBe('fill="{{unknown.token.xyz}}"');
  });

  it("replaces themeOverride when themeId matches", () => {
    const result = resolveTokenPlaceholders('fill="{{color.brand}}"', "my-theme");
    expect(result).toBe('fill="#2D5A4E"');
  });

  it("handles multiple placeholders in one string", () => {
    const result = resolveTokenPlaceholders(
      '<rect fill="{{color.brand}}" stroke="{{color.accent}}"/>'
    );
    expect(result).toBe('<rect fill="#2D5A4E" stroke="#B94A3E"/>');
    expect(result).not.toContain("{{");
  });
});

describe("AC-001: render with assets — placeholder resolved, SVG injected", () => {
  it("renderMarkdown with assets heading.h2 produces output containing resolved color #2D5A4E", async () => {
    registerTheme(
      makeDecoratedTheme("decorated-test", {
        "heading.h2": '<svg width="16" height="4"><rect fill="{{color.brand}}"/></svg>',
      })
    );
    const result = await renderMarkdown("## 标题", { themeId: "decorated-test" });
    expect(result.html).toContain("#2D5A4E");
    expect(result.html).not.toContain("{{");
    expect(result.html).not.toContain("{{color.brand}}");
  });

  it("rendered SVG is present as actual markup (not HTML-escaped)", async () => {
    registerTheme(
      makeDecoratedTheme("decorated-test2", {
        "heading.h2": '<svg width="16" height="4"><rect fill="{{color.brand}}"/></svg>',
      })
    );
    const result = await renderMarkdown("## 标题", { themeId: "decorated-test2" });
    expect(result.html).toContain("<svg");
    expect(result.html).toContain("<rect");
    expect(result.html).not.toContain("&lt;svg");
  });
});

describe("AC-001: default theme assets library exports and resolves correctly", () => {
  it("defaultAssets contains heading.h1 and heading.h2 keys", () => {
    expect(Object.keys(defaultAssets)).toContain("heading.h1");
    expect(Object.keys(defaultAssets)).toContain("heading.h2");
  });

  it("all defaultAssets values are non-empty strings", () => {
    for (const [, val] of Object.entries(defaultAssets)) {
      expect(typeof val).toBe("string");
      expect(val.length).toBeGreaterThan(0);
    }
  });

  it("all defaultAssets SVGs resolve all {{}} placeholders after resolveTokenPlaceholders", () => {
    for (const [key, svg] of Object.entries(defaultAssets)) {
      const resolved = resolveTokenPlaceholders(svg, "default");
      expect(resolved).not.toContain("{{");
      expect(resolved.length).toBeGreaterThan(0);
      expect(resolved, `asset ${key} should not have unresolved placeholders`).not.toMatch(
        /\{\{[^}]+\}\}/
      );
    }
  });
});

describe("AC-004: theme switching — decoration follows theme assets", () => {
  it("two themes with different assets produce different decoration outputs", async () => {
    registerTheme(
      makeDecoratedTheme("theme-a", {
        "heading.h2": '<svg><rect fill="#AAAA00"/></svg>',
      })
    );
    registerTheme(
      makeDecoratedTheme("theme-b", {
        "heading.h2": '<svg><rect fill="#0000BB"/></svg>',
      })
    );

    const resultA = await renderMarkdown("## hello", { themeId: "theme-a" });
    const resultB = await renderMarkdown("## hello", { themeId: "theme-b" });

    expect(resultA.html).toContain("#AAAA00");
    expect(resultA.html).not.toContain("#0000BB");
    expect(resultB.html).toContain("#0000BB");
    expect(resultB.html).not.toContain("#AAAA00");
    expect(resultA.html).not.toBe(resultB.html);
  });
});

describe("determinism: empty assets => no-op (guard base)", () => {
  it("renderMarkdown with empty assets theme produces no SVG decoration", async () => {
    registerTheme(makeDecoratedTheme("empty-assets", {}));
    const result = await renderMarkdown("## 标题", { themeId: "empty-assets" });
    expect(result.html).not.toContain("<svg");
    expect(result.html).not.toContain("{{");
  });

  it("renderMarkdown with no theme produces no SVG decoration", async () => {
    const result = await renderMarkdown("## 标题");
    expect(result.html).not.toContain("<svg");
    expect(result.html).not.toContain("{{");
  });

  it("renderMarkdown with default theme (assets:{}) produces no SVG decoration", async () => {
    const result = await renderMarkdown("## 标题", { themeId: "default" });
    expect(result.html).not.toContain("<svg");
    expect(result.html).not.toContain("{{");
  });

  it("injectDecorations returns same hast reference when assets is empty", () => {
    const hast = {
      type: "root" as const,
      children: [],
    };
    const result = injectDecorations(hast, {
      id: "t",
      name: "T",
      tokens: {},
      assets: {},
    });
    expect(result).toBe(hast);
  });

  it("injectDecorations returns same hast reference when theme is undefined", () => {
    const hast = {
      type: "root" as const,
      children: [],
    };
    const result = injectDecorations(hast, undefined);
    expect(result).toBe(hast);
  });
});
