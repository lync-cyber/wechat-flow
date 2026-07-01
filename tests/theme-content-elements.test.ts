import { beforeEach, describe, expect, it } from "vitest";
import { validateThemeGuard } from "../packages/core/src/guard/index.ts";
import { renderMarkdown, resetThemeRegistry } from "../packages/core/src/index.ts";
import { inlineStyle } from "../packages/core/src/pipeline/inline-style.ts";
import { parseMarkdown } from "../packages/core/src/pipeline/parse.ts";
import { serializeHast } from "../packages/core/src/pipeline/serialize.ts";
import { transformToHast } from "../packages/core/src/pipeline/transform.ts";
import { registerTheme } from "../packages/core/src/registry/theme.ts";
import businessTheme from "../packages/themes/business/src/index.ts";
import defaultTheme from "../packages/themes/default/src/index.ts";
import literaryTheme from "../packages/themes/literary/src/index.ts";
import magazineTheme from "../packages/themes/magazine/src/index.ts";
import techTheme from "../packages/themes/tech/src/index.ts";

const ALL_THEMES = [
  { id: "default", theme: defaultTheme },
  { id: "magazine", theme: magazineTheme },
  { id: "literary", theme: literaryTheme },
  { id: "business", theme: businessTheme },
  { id: "tech", theme: techTheme },
] as const;

const CONTENT_ELEMENT_KEYS = ["ul", "ol", "li", "img", "table", "a"] as const;

// <ul> is unconditionally rewritten to <table> by the transform-list-to-table ruleset
// (WeChat strips list-style rendering), so it never survives to post-ruleset output.
// AC-005 asserts rendered-output styles on the elements that survive the wechat-compat
// pipeline; <ul>'s block declaration is verified by AC-002/003 and its pipeline tag-path
// binding by AC-001. Ordered lists (<ol>/<li>) are not rewritten and carry their styles.
const RENDERED_SURVIVING_KEYS = ["ol", "li", "img", "table", "a"] as const;

// AC-004 / GREEN token table (from task card): each theme references its own tokens.
const EXPECTED_TOKENS: Record<
  string,
  {
    colorLink: string;
    decorationLinkUnderline: string;
    spacingListItem: string;
    fontLineHeightBody: string;
  }
> = {
  default: {
    colorLink: "#2D5A4E",
    decorationLinkUnderline: "underline",
    spacingListItem: "6px",
    fontLineHeightBody: "1.85",
  },
  magazine: {
    colorLink: "#C44011",
    decorationLinkUnderline: "none",
    spacingListItem: "8px",
    fontLineHeightBody: "1.9",
  },
  literary: {
    colorLink: "#7B4F2E",
    decorationLinkUnderline: "underline",
    spacingListItem: "7px",
    fontLineHeightBody: "2.0",
  },
  business: {
    colorLink: "#1A4F8A",
    decorationLinkUnderline: "none",
    spacingListItem: "6px",
    fontLineHeightBody: "1.75",
  },
  tech: {
    colorLink: "#58A6FF",
    decorationLinkUnderline: "none",
    spacingListItem: "6px",
    fontLineHeightBody: "1.8",
  },
};

const CONTENT_MARKDOWN = [
  "1. 列表项",
  "",
  "![图](url)",
  "",
  "| 表头 |",
  "| --- |",
  "| 值 |",
  "",
  "[链接](url)",
].join("\n");

function extractCssProp(style: string, prop: string): string | undefined {
  const match = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(style);
  return match ? match[1].trim() : undefined;
}

function extractTagStyle(html: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}[^>]*\\sstyle="([^"]*)"`).exec(html);
  return match?.[1];
}

beforeEach(() => {
  resetThemeRegistry();
});

// ---------------------------------------------------------------------------
// AC-001: pipeline — buildStyleMap / inlineStyle tag-path picks up new keys
// ---------------------------------------------------------------------------

describe("AC-001: inlineStyle tag-path 命中 ul/ol/li/img/table/a 的 themeTokens", () => {
  const CUSTOM_TOKENS = {
    ul: { default: { "margin-bottom": "6px" } },
    ol: { default: { "margin-bottom": "6px" } },
    li: { default: { "line-height": "1.85" } },
    img: { default: { "max-width": "100%" } },
    table: { default: { "border-collapse": "collapse" } },
    a: { default: { color: "#2D5A4E", "text-decoration": "underline" } },
  };

  function renderWithTokens(md: string): string {
    const mdast = parseMarkdown(md);
    const hast = transformToHast(mdast);
    const inlined = inlineStyle(hast, CUSTOM_TOKENS);
    return serializeHast(inlined);
  }

  it("<ul> 产出 style 含 margin-bottom: 6px（来自 themeTokens.ul.default）", () => {
    const html = renderWithTokens("- item one\n- item two");
    const style = extractTagStyle(html, "ul");
    expect(style).toBeDefined();
    expect(extractCssProp(style ?? "", "margin-bottom")).toBe("6px");
  });

  it("<ol> 产出 style 含 margin-bottom: 6px（来自 themeTokens.ol.default）", () => {
    const html = renderWithTokens("1. item one\n2. item two");
    const style = extractTagStyle(html, "ol");
    expect(style).toBeDefined();
    expect(extractCssProp(style ?? "", "margin-bottom")).toBe("6px");
  });

  it("<li> 产出 style 含 line-height: 1.85（来自 themeTokens.li.default）", () => {
    const html = renderWithTokens("- item one");
    const style = extractTagStyle(html, "li");
    expect(style).toBeDefined();
    expect(extractCssProp(style ?? "", "line-height")).toBe("1.85");
  });

  it("<img> 产出 style 含 max-width: 100%（来自 themeTokens.img.default）", () => {
    const html = renderWithTokens("![alt](https://example.com/a.png)");
    const style = extractTagStyle(html, "img");
    expect(style).toBeDefined();
    expect(extractCssProp(style ?? "", "max-width")).toBe("100%");
  });

  it("<table> 产出 style 含 border-collapse: collapse（来自 themeTokens.table.default）", () => {
    const html = renderWithTokens("| a | b |\n| --- | --- |\n| 1 | 2 |");
    const style = extractTagStyle(html, "table");
    expect(style).toBeDefined();
    expect(extractCssProp(style ?? "", "border-collapse")).toBe("collapse");
  });

  it("<a> 产出 style 含 color: #2D5A4E 与 text-decoration: underline（来自 themeTokens.a.default）", () => {
    const html = renderWithTokens("[链接](https://example.com)");
    const style = extractTagStyle(html, "a");
    expect(style).toBeDefined();
    expect(extractCssProp(style ?? "", "color")).toBe("#2D5A4E");
    expect(extractCssProp(style ?? "", "text-decoration")).toBe("underline");
  });

  it("themeTokens 缺失该 key 时对应元素无 style 属性（证明 style 来自 themeTokens 而非硬编码）", () => {
    const mdast = parseMarkdown("- item one");
    const hast = transformToHast(mdast);
    const inlined = inlineStyle(hast, {});
    const html = serializeHast(inlined);
    expect(html).not.toMatch(/<ul[^>]*\sstyle="/);
  });
});

// ---------------------------------------------------------------------------
// AC-002: default theme — list.ts / media.ts declared, spread into index.ts
// ---------------------------------------------------------------------------

describe("AC-002: default 主题新增 6 元素样式声明", () => {
  const blocks = defaultTheme.blocks ?? {};

  it("ul.default.margin-bottom 等于 default 主题 --spacing-list-item 值 (6px)", () => {
    const val = blocks.ul?.default?.["margin-bottom"];
    expect(val).toBe(defaultTheme.tokens["--spacing-list-item"]);
    expect(val).toBe("6px");
  });

  it("ol.default.margin-bottom 等于 default 主题 --spacing-list-item 值 (6px)", () => {
    const val = blocks.ol?.default?.["margin-bottom"];
    expect(val).toBe(defaultTheme.tokens["--spacing-list-item"]);
    expect(val).toBe("6px");
  });

  it("a.default.color 等于 default 主题 --color-link 值 (#2D5A4E)", () => {
    const val = blocks.a?.default?.color;
    expect(val).toBe(defaultTheme.tokens["--color-link"]);
    expect(val).toBe("#2D5A4E");
  });

  it("a.default.text-decoration 等于 default 主题 --decoration-link-underline 值 (underline)", () => {
    const val = blocks.a?.default?.["text-decoration"];
    expect(val).toBe(defaultTheme.tokens["--decoration-link-underline"]);
    expect(val).toBe("underline");
  });

  it("img.default 含 max-width: 100%", () => {
    expect(blocks.img?.default?.["max-width"]).toBe("100%");
  });

  it("table.default 含 border-collapse: collapse", () => {
    expect(blocks.table?.default?.["border-collapse"]).toBe("collapse");
  });

  it("li.default.line-height 等于 default 主题 --font-line-height-body 值 (1.85)", () => {
    const val = blocks.li?.default?.["line-height"];
    expect(val).toBe(defaultTheme.tokens["--font-line-height-body"]);
    expect(val).toBe("1.85");
  });

  it("declared block values 不含 CSS 变量语法 var(--", () => {
    for (const key of CONTENT_ELEMENT_KEYS) {
      const decl = blocks[key]?.default ?? {};
      for (const value of Object.values(decl)) {
        expect(value).not.toContain("var(--");
      }
    }
  });

  it("validateThemeGuard(defaultTheme) 无 baseline-selector-density 错误（新增 6 key 不破坏既有守卫）", () => {
    const result = validateThemeGuard(defaultTheme);
    const failure = result.failures.find((f) => f.dimension === "baseline-selector-density");
    expect(failure).toBeUndefined();
  });

  it("validateThemeGuard(defaultTheme) 整体 passed === true", () => {
    const result = validateThemeGuard(defaultTheme);
    expect(result.passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-003: 其余 4 主题 — 各自新增同类 list/media blocks，引用自身 token
// ---------------------------------------------------------------------------

describe("AC-003: magazine/literary/business/tech 主题新增 6 元素样式声明并引用自身 token", () => {
  for (const { id, theme } of ALL_THEMES) {
    if (id === "default") continue;
    const expected = EXPECTED_TOKENS[id];

    describe(`${id} 主题`, () => {
      const blocks = theme.blocks ?? {};

      for (const key of CONTENT_ELEMENT_KEYS) {
        it(`theme.blocks.${key}.default 已定义且非空`, () => {
          const decl = blocks[key]?.default;
          expect(decl).toBeDefined();
          expect(Object.keys(decl ?? {}).length).toBeGreaterThan(0);
        });
      }

      it(`ul/ol.default.margin-bottom 等于 ${id} 主题 --spacing-list-item 值 (${expected.spacingListItem})`, () => {
        expect(blocks.ul?.default?.["margin-bottom"]).toBe(expected.spacingListItem);
        expect(blocks.ol?.default?.["margin-bottom"]).toBe(expected.spacingListItem);
      });

      it(`li.default.line-height 等于 ${id} 主题 --font-line-height-body 值 (${expected.fontLineHeightBody})`, () => {
        expect(blocks.li?.default?.["line-height"]).toBe(expected.fontLineHeightBody);
      });

      it(`a.default.color 等于 ${id} 主题 --color-link 值 (${expected.colorLink})`, () => {
        expect(blocks.a?.default?.color).toBe(expected.colorLink);
      });

      it("img.default 含 max-width: 100%", () => {
        expect(blocks.img?.default?.["max-width"]).toBe("100%");
      });

      it("table.default 含 border-collapse: collapse", () => {
        expect(blocks.table?.default?.["border-collapse"]).toBe("collapse");
      });
    });
  }

  it("magazine 与 default 的 a.default.color 不同（各引用自身 token，不跨主题硬编码）", () => {
    const magazineColor = magazineTheme.blocks?.a?.default?.color;
    const defaultColor = defaultTheme.blocks?.a?.default?.color;
    expect(magazineColor).toBeDefined();
    expect(magazineColor).not.toBe(defaultColor);
  });
});

// ---------------------------------------------------------------------------
// AC-004: link 一致性审计 — a 样式与自身 token 一致（跨主题差异化模式）
// ---------------------------------------------------------------------------

describe("AC-004: 各主题 a.default 与自身 --color-link / --decoration-link-underline 一致", () => {
  for (const { id, theme } of ALL_THEMES) {
    it(`${id}: a.default.color === tokens['--color-link']`, () => {
      const aColor = theme.blocks?.a?.default?.color;
      expect(aColor).toBe(theme.tokens["--color-link"]);
    });

    it(`${id}: a.default['text-decoration'] === tokens['--decoration-link-underline']`, () => {
      const aDecoration = theme.blocks?.a?.default?.["text-decoration"];
      expect(aDecoration).toBe(theme.tokens["--decoration-link-underline"]);
    });
  }

  it("跨主题一致性模式非统一颜色 — 5 套主题 a.default.color 至少存在两个不同值", () => {
    const colors = ALL_THEMES.map(({ theme }) => theme.blocks?.a?.default?.color);
    const unique = new Set(colors);
    expect(unique.size).toBeGreaterThan(1);
  });

  it("跨主题一致性模式非统一 decoration — 5 套主题 text-decoration 至少存在两个不同值（underline vs none）", () => {
    const decorations = ALL_THEMES.map(
      ({ theme }) => theme.blocks?.a?.default?.["text-decoration"]
    );
    const unique = new Set(decorations);
    expect(unique.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// AC-005: 产物 inline 验证 — 5 套主题渲染同一 Markdown，6 元素均含非空 style，跨主题差异化
// ---------------------------------------------------------------------------

describe("AC-005: 5 套主题渲染含 list/img/table/a 的 Markdown，产物 6 元素均含非空 style", () => {
  beforeEach(() => {
    resetThemeRegistry();
    for (const { theme } of ALL_THEMES) {
      registerTheme(theme);
    }
  });

  for (const { id } of ALL_THEMES) {
    describe(`主题 ${id}`, () => {
      it("渲染产物 ol/li/img/table/a（管线存活元素）均含非空 style attr", async () => {
        const result = await renderMarkdown(CONTENT_MARKDOWN, { themeId: id });
        for (const tag of RENDERED_SURVIVING_KEYS) {
          const style = extractTagStyle(result.html, tag);
          expect(style, `<${tag}> should have a style attribute in theme ${id}`).toBeDefined();
          expect(
            (style ?? "").trim().length,
            `<${tag}> style should be non-empty in theme ${id}`
          ).toBeGreaterThan(0);
        }
      });
    });
  }

  it("无序列表经 transform-list-to-table 转为 <table>，产物无 <ul>（既定微信兼容行为，非 T-128 缺陷）", async () => {
    const unorderedMd = CONTENT_MARKDOWN.replace("1. 列表项", "- 列表项");
    const result = await renderMarkdown(unorderedMd, { themeId: "default" });
    expect(result.html).not.toMatch(/<ul[^>]*>/);
    expect(result.html).toMatch(/<table[^>]*\sstyle="[^"]*border-collapse/);
  });

  it("跨主题同元素 <a> style 串不全等（差异化生效）", async () => {
    const styles = new Set<string>();
    for (const { id } of ALL_THEMES) {
      const result = await renderMarkdown(CONTENT_MARKDOWN, { themeId: id });
      const style = extractTagStyle(result.html, "a");
      if (style) styles.add(style);
    }
    expect(styles.size).toBeGreaterThan(1);
  });

  it("跨主题同元素 <li> style 串不全等（差异化生效）", async () => {
    const styles = new Set<string>();
    for (const { id } of ALL_THEMES) {
      const result = await renderMarkdown(CONTENT_MARKDOWN, { themeId: id });
      const style = extractTagStyle(result.html, "li");
      if (style) styles.add(style);
    }
    expect(styles.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// AC-006: 守卫边界不变 — baseline-selector-density 覆盖列表仍严格为原 10 key
// ---------------------------------------------------------------------------

describe("AC-006: baseline-selector-density 覆盖列表不因新增 6 key 扩张", () => {
  const ORIGINAL_REQUIRED_KEYS = [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "blockquote",
    "code",
    "hr",
  ];

  it("移除 defaultTheme 全部 6 新 content-element key 后 baseline-selector-density 仍不报错（说明它们不在必检列表内）", () => {
    const { ul, ol, li, img, table, a, ...blocksWithoutNewKeys } = defaultTheme.blocks ?? {};
    const theme = { ...defaultTheme, blocks: blocksWithoutNewKeys };
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "baseline-selector-density");
    expect(failure).toBeUndefined();
  });

  it("缺失原有必检 key（如 h1）时依然报错，即便 6 个新 key 都存在（守卫边界未被稀释）", () => {
    const { h1, ...blocksWithoutH1 } = defaultTheme.blocks ?? {};
    const theme = { ...defaultTheme, blocks: blocksWithoutH1 };
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "baseline-selector-density");
    expect(failure).toBeDefined();
    expect(failure?.severity).toBe("error");
    expect(failure?.message).toContain("h1");
  });

  it("REQUIRED_KEYS 常量语义不变：产生失败消息只提及原 10 key 集合中的缺失项，不提及新 6 key", () => {
    const { h2, ul, ol, li, img, table, a, ...blocksMissingBoth } = defaultTheme.blocks ?? {};
    const theme = { ...defaultTheme, blocks: blocksMissingBoth };
    const result = validateThemeGuard(theme);
    const failure = result.failures.find((f) => f.dimension === "baseline-selector-density");
    expect(failure).toBeDefined();
    expect(failure?.message).toContain("h2");
    for (const key of CONTENT_ELEMENT_KEYS) {
      expect(failure?.message).not.toContain(key);
    }
    for (const key of ORIGINAL_REQUIRED_KEYS) {
      if (key === "h2") continue;
      expect(failure?.message).not.toContain(`Missing required block keys: ${key}`);
    }
  });
});
