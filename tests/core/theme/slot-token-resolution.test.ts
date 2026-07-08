import { beforeEach, describe, expect, it } from "vitest";
import {
  registerTheme,
  renderMarkdown,
  resetBlockRegistry,
  resetVariantRegistry,
} from "../../../packages/core/src/index.ts";
import "../../../packages/blocks/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";
import { tokens as defaultTokens } from "../../../packages/themes/default/src/tokens.ts";
import literaryTheme from "../../../packages/themes/literary/src/index.ts";
import { tokens as literaryTokens } from "../../../packages/themes/literary/src/tokens.ts";
import techTheme from "../../../packages/themes/tech/src/index.ts";
import { tokens as techTokens } from "../../../packages/themes/tech/src/tokens.ts";

// Reproduces apps/editor/src/main.ts registration order; renderMarkdown silently
// falls back to core DEFAULT_TOKENS for an unregistered themeId, so registration
// must happen before any renderMarkdown({ themeId }) call in this file.
registerTheme(defaultTheme);
registerTheme(literaryTheme);
registerTheme(techTheme);

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
});

// Serialized style attributes HTML-encode `'` as `&#x27;`, which itself contains a
// literal `;` — unescape before splitting on `;` so multi-value font-family declarations
// (e.g. `'LXGW WenKai', 'Source Han Serif CN'`) are not truncated mid-value.
function htmlUnescapeQuotes(value: string): string {
  return value.replace(/&#x27;/g, "'");
}

function parseDeclarations(style: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const decl of htmlUnescapeQuotes(style).split(";")) {
    const trimmed = decl.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return out;
}

function extractFirst(html: string, pattern: RegExp): Record<string, string> {
  const match = html.match(pattern);
  expect(match, `pattern ${String(pattern)} must match rendered html:\n${html}`).not.toBeNull();
  return parseDeclarations(match?.[1] ?? "");
}

const QUOTE_MARK_SPAN = /<span style="([^"]*)">"<\/span>/;
const QUOTE_DROPCAP_DIV = /<section style="([^"]*)">引<\/section>/;
const PARAGRAPH_DROPCAP_DIV = /<section style="([^"]*)">首<\/section>/;
const PULL_QUOTE_MARK_SPAN = /<span style="([^"]*)">「<\/span>/;
const PULL_QUOTE_AUTHOR_DIV = /<section style="([^"]*)">—— 鲁迅<\/section>/;

const QUOTE_LARGE_MARK_MD = ":::quote{.large-quote-mark}\n引用文字\n:::";
const QUOTE_DROPCAP_MD = ":::quote{.dropcap}\n引用文字\n:::";
const PARAGRAPH_DROPCAP_MD = ":::paragraph{.dropcap}\n首字后面的正文\n:::";
const PULL_QUOTE_DECORATED_MD = ':::pull-quote{.decorated author="鲁迅"}\n摘引文字\n:::';

// AC-001: quote large-quote-mark 装饰引号色值随主题变化，各主题渲染值 = 该主题 --color-brand
describe("AC-001: quote large-quote-mark 装饰引号色值随主题变化", () => {
  it("default 主题渲染色值 = default --color-brand", async () => {
    const result = await renderMarkdown(QUOTE_LARGE_MARK_MD, { themeId: "default" });
    const decl = extractFirst(result.html, QUOTE_MARK_SPAN);
    expect(decl.color).toBe(defaultTokens["--color-brand"]);
  });

  it("literary 主题渲染色值 = literary --color-brand（非 default 硬编码值）", async () => {
    const result = await renderMarkdown(QUOTE_LARGE_MARK_MD, { themeId: "literary" });
    const decl = extractFirst(result.html, QUOTE_MARK_SPAN);
    expect(decl.color).toBe(literaryTokens["--color-brand"]);
  });

  it("tech 主题渲染色值 = tech --color-brand（非 default 硬编码值）", async () => {
    const result = await renderMarkdown(QUOTE_LARGE_MARK_MD, { themeId: "tech" });
    const decl = extractFirst(result.html, QUOTE_MARK_SPAN);
    expect(decl.color).toBe(techTokens["--color-brand"]);
  });

  it("literary 与 tech 渲染色值互不相同（跨主题差异化，非恒等硬编码）", async () => {
    const literaryResult = await renderMarkdown(QUOTE_LARGE_MARK_MD, { themeId: "literary" });
    const techResult = await renderMarkdown(QUOTE_LARGE_MARK_MD, { themeId: "tech" });
    const literaryDecl = extractFirst(literaryResult.html, QUOTE_MARK_SPAN);
    const techDecl = extractFirst(techResult.html, QUOTE_MARK_SPAN);
    expect(literaryDecl.color).not.toBe(techDecl.color);
  });
});

// AC-001: quote dropcap 装饰首字色值与字体随主题变化（§9.8 color = 主题 --color-brand，font-family = 主题 --font-family-heading）
describe("AC-001: quote dropcap 装饰首字色值与字体随主题变化", () => {
  it("default 主题渲染色值 = default --color-brand，字体 = default --font-family-heading", async () => {
    const result = await renderMarkdown(QUOTE_DROPCAP_MD, { themeId: "default" });
    const decl = extractFirst(result.html, QUOTE_DROPCAP_DIV);
    expect(decl.color).toBe(defaultTokens["--color-brand"]);
    expect(decl["font-family"]).toBe(defaultTokens["--font-family-heading"]);
  });

  it("literary 主题渲染色值 = literary --color-brand，字体 = literary --font-family-heading", async () => {
    const result = await renderMarkdown(QUOTE_DROPCAP_MD, { themeId: "literary" });
    const decl = extractFirst(result.html, QUOTE_DROPCAP_DIV);
    expect(decl.color).toBe(literaryTokens["--color-brand"]);
    expect(decl["font-family"]).toBe(literaryTokens["--font-family-heading"]);
  });

  it("tech 主题渲染色值 = tech --color-brand，字体 = tech --font-family-heading", async () => {
    const result = await renderMarkdown(QUOTE_DROPCAP_MD, { themeId: "tech" });
    const decl = extractFirst(result.html, QUOTE_DROPCAP_DIV);
    expect(decl.color).toBe(techTokens["--color-brand"]);
    expect(decl["font-family"]).toBe(techTokens["--font-family-heading"]);
  });

  it("literary 与 tech 渲染色值互不相同（跨主题差异化，非恒等硬编码）", async () => {
    const literaryResult = await renderMarkdown(QUOTE_DROPCAP_MD, { themeId: "literary" });
    const techResult = await renderMarkdown(QUOTE_DROPCAP_MD, { themeId: "tech" });
    const literaryDecl = extractFirst(literaryResult.html, QUOTE_DROPCAP_DIV);
    const techDecl = extractFirst(techResult.html, QUOTE_DROPCAP_DIV);
    expect(literaryDecl.color).not.toBe(techDecl.color);
  });
});

// AC-001: paragraph dropcap 装饰首字色值与字体随主题变化（§9.8 同一方案）
describe("AC-001: paragraph dropcap 装饰首字色值与字体随主题变化", () => {
  it("default 主题渲染色值 = default --color-brand，字体 = default --font-family-heading", async () => {
    const result = await renderMarkdown(PARAGRAPH_DROPCAP_MD, { themeId: "default" });
    const decl = extractFirst(result.html, PARAGRAPH_DROPCAP_DIV);
    expect(decl.color).toBe(defaultTokens["--color-brand"]);
    expect(decl["font-family"]).toBe(defaultTokens["--font-family-heading"]);
  });

  it("literary 主题渲染色值 = literary --color-brand，字体 = literary --font-family-heading", async () => {
    const result = await renderMarkdown(PARAGRAPH_DROPCAP_MD, { themeId: "literary" });
    const decl = extractFirst(result.html, PARAGRAPH_DROPCAP_DIV);
    expect(decl.color).toBe(literaryTokens["--color-brand"]);
    expect(decl["font-family"]).toBe(literaryTokens["--font-family-heading"]);
  });

  it("tech 主题渲染色值 = tech --color-brand，字体 = tech --font-family-heading", async () => {
    const result = await renderMarkdown(PARAGRAPH_DROPCAP_MD, { themeId: "tech" });
    const decl = extractFirst(result.html, PARAGRAPH_DROPCAP_DIV);
    expect(decl.color).toBe(techTokens["--color-brand"]);
    expect(decl["font-family"]).toBe(techTokens["--font-family-heading"]);
  });

  it("literary 与 tech 渲染色值互不相同（跨主题差异化，非恒等硬编码）", async () => {
    const literaryResult = await renderMarkdown(PARAGRAPH_DROPCAP_MD, { themeId: "literary" });
    const techResult = await renderMarkdown(PARAGRAPH_DROPCAP_MD, { themeId: "tech" });
    const literaryDecl = extractFirst(literaryResult.html, PARAGRAPH_DROPCAP_DIV);
    const techDecl = extractFirst(techResult.html, PARAGRAPH_DROPCAP_DIV);
    expect(literaryDecl.color).not.toBe(techDecl.color);
  });
});

// AC-001: pull-quote decorated 装饰引号与署名色值随主题变化（§10.3 quote-mark = 主题 --color-brand，author = 主题 --color-text-muted）
describe("AC-001: pull-quote decorated 装饰引号与署名色值随主题变化", () => {
  it("default 主题：quote-mark 色值 = default --color-brand，署名色值 = default --color-text-muted", async () => {
    const result = await renderMarkdown(PULL_QUOTE_DECORATED_MD, { themeId: "default" });
    const quoteMarkDecl = extractFirst(result.html, PULL_QUOTE_MARK_SPAN);
    expect(quoteMarkDecl.color).toBe(defaultTokens["--color-brand"]);
    const authorDecl = extractFirst(result.html, PULL_QUOTE_AUTHOR_DIV);
    expect(authorDecl.color).toBe(defaultTokens["--color-text-muted"]);
  });

  it("literary 主题：quote-mark 色值 = literary --color-brand，署名色值 = literary --color-text-muted", async () => {
    const result = await renderMarkdown(PULL_QUOTE_DECORATED_MD, { themeId: "literary" });
    const quoteMarkDecl = extractFirst(result.html, PULL_QUOTE_MARK_SPAN);
    expect(quoteMarkDecl.color).toBe(literaryTokens["--color-brand"]);
    const authorDecl = extractFirst(result.html, PULL_QUOTE_AUTHOR_DIV);
    expect(authorDecl.color).toBe(literaryTokens["--color-text-muted"]);
  });

  it("tech 主题：quote-mark 色值 = tech --color-brand，署名色值 = tech --color-text-muted", async () => {
    const result = await renderMarkdown(PULL_QUOTE_DECORATED_MD, { themeId: "tech" });
    const quoteMarkDecl = extractFirst(result.html, PULL_QUOTE_MARK_SPAN);
    expect(quoteMarkDecl.color).toBe(techTokens["--color-brand"]);
    const authorDecl = extractFirst(result.html, PULL_QUOTE_AUTHOR_DIV);
    expect(authorDecl.color).toBe(techTokens["--color-text-muted"]);
  });

  it("literary 与 tech 的 quote-mark/署名色值互不相同（跨主题差异化，非恒等硬编码）", async () => {
    const literaryResult = await renderMarkdown(PULL_QUOTE_DECORATED_MD, { themeId: "literary" });
    const techResult = await renderMarkdown(PULL_QUOTE_DECORATED_MD, { themeId: "tech" });

    const literaryQuoteMark = extractFirst(literaryResult.html, PULL_QUOTE_MARK_SPAN);
    const techQuoteMark = extractFirst(techResult.html, PULL_QUOTE_MARK_SPAN);
    expect(literaryQuoteMark.color).not.toBe(techQuoteMark.color);

    const literaryAuthor = extractFirst(literaryResult.html, PULL_QUOTE_AUTHOR_DIV);
    const techAuthor = extractFirst(techResult.html, PULL_QUOTE_AUTHOR_DIV);
    expect(literaryAuthor.color).not.toBe(techAuthor.color);
  });
});

// AC-002: 通用 token 解析机制须跨 block/slot 统一生效，而非针对单一 slot 的定点硬编码补丁
describe("AC-002: 跨 block/slot 统一 token 解析机制", () => {
  const COMBINED_MD = `:::quote{.large-quote-mark}
大字引用文字
:::

:::quote{.dropcap}
沉字引用文字
:::

:::paragraph{.dropcap}
开篇段落文字
:::

:::pull-quote{.decorated author="鲁迅"}
摘引文字内容
:::`;

  it("literary 主题单次渲染中，quote/paragraph/pull-quote 四处装饰 slot 色值均取自 literary token（非各自独立硬编码）", async () => {
    const result = await renderMarkdown(COMBINED_MD, { themeId: "literary" });

    const largeQuoteMark = extractFirst(result.html, QUOTE_MARK_SPAN);
    expect(largeQuoteMark.color).toBe(literaryTokens["--color-brand"]);

    const quoteDropcap = extractFirst(result.html, /<section style="([^"]*)">沉<\/section>/);
    expect(quoteDropcap.color).toBe(literaryTokens["--color-brand"]);

    const paragraphDropcap = extractFirst(result.html, /<section style="([^"]*)">开<\/section>/);
    expect(paragraphDropcap.color).toBe(literaryTokens["--color-brand"]);

    const pullQuoteMark = extractFirst(result.html, PULL_QUOTE_MARK_SPAN);
    expect(pullQuoteMark.color).toBe(literaryTokens["--color-brand"]);

    const pullQuoteAuthor = extractFirst(result.html, PULL_QUOTE_AUTHOR_DIV);
    expect(pullQuoteAuthor.color).toBe(literaryTokens["--color-text-muted"]);
  });
});

// AC-002 回归护栏: 无 token 占位的 slot 声明（pull-quote decorated root 容器的布局类声明，
// §10.3 只要求 quote-mark/author 两个 slot 主题化，root 的 text-align/padding/margin/font-size
// 并非装饰色值）须在三主题下渲染保持字节级不变
describe("AC-002 回归护栏: pull-quote decorated root 容器非色值布局声明字节级不变（跨主题）", () => {
  it.each(["default", "literary", "tech"] as const)(
    "%s 主题渲染，root 容器 text-align/padding/margin/font-size 声明保持字面值不变",
    async (themeId) => {
      const result = await renderMarkdown(PULL_QUOTE_DECORATED_MD, { themeId });
      const containerMatch = result.html.match(
        /<section data-block="pull-quote" data-variant="decorated" style="([^"]*)"/
      );
      expect(containerMatch, `themeId=${themeId} container must render`).not.toBeNull();
      const decl = parseDeclarations(containerMatch?.[1] ?? "");
      expect(decl["text-align"]).toBe("center");
      expect(decl.padding).toBe("24px 16px");
      expect(decl.margin).toBe("24px 0");
      expect(decl["font-size"]).toBe("1.25em");
    }
  );
});

// AC-003: default 主题装饰色渲染值与 T-140 样张色值一致 — default token 与现硬编码值同源，
// 此断言在现状实现下预期 pre-existing PASS（详见任务 summary）
describe("AC-003: default 主题装饰色渲染值与 T-140 样张色值一致（数据驱动基线）", () => {
  it("quote large-quote-mark 装饰引号色值等于 default --color-brand 数据源值", async () => {
    const result = await renderMarkdown(QUOTE_LARGE_MARK_MD, { themeId: "default" });
    const decl = extractFirst(result.html, QUOTE_MARK_SPAN);
    expect(decl.color).toBe(defaultTokens["--color-brand"]);
  });

  it("quote/paragraph dropcap 首字色值等于 default --color-brand 数据源值", async () => {
    const quoteResult = await renderMarkdown(QUOTE_DROPCAP_MD, { themeId: "default" });
    const quoteDecl = extractFirst(quoteResult.html, QUOTE_DROPCAP_DIV);
    expect(quoteDecl.color).toBe(defaultTokens["--color-brand"]);

    const paragraphResult = await renderMarkdown(PARAGRAPH_DROPCAP_MD, { themeId: "default" });
    const paragraphDecl = extractFirst(paragraphResult.html, PARAGRAPH_DROPCAP_DIV);
    expect(paragraphDecl.color).toBe(defaultTokens["--color-brand"]);
  });

  it("pull-quote decorated 署名色值等于 default --color-text-muted 数据源值", async () => {
    const result = await renderMarkdown(PULL_QUOTE_DECORATED_MD, { themeId: "default" });
    const decl = extractFirst(result.html, PULL_QUOTE_AUTHOR_DIV);
    expect(decl.color).toBe(defaultTokens["--color-text-muted"]);
  });
});
