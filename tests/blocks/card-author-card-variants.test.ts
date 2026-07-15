import { beforeEach, describe, expect, it } from "vitest";
import {
  getBlockBaseStyle,
  getUnimplementedVariants,
  registerTheme,
  renderMarkdown,
  resetBlockRegistry,
  resetThemeRegistry,
  resetVariantRegistry,
  runVariantDiffGuard,
} from "../../packages/core/src/index.ts";
import "../../packages/blocks/src/index.ts";
import defaultTheme from "../../packages/themes/default/src/index.ts";
import { buildDirectiveMarkdown } from "./directive-markdown-fixtures.ts";

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
  resetThemeRegistry();
  registerTheme(defaultTheme);
});

function extractRootStyle(html: string, blockId: string, variantId: string): string {
  const re = new RegExp(
    `<section data-block="${blockId}" data-variant="${variantId}"[^>]* style="([^"]*)"`
  );
  const match = html.match(re);
  expect(match, `no ${blockId}/${variantId} root found in html: ${html}`).not.toBeNull();
  return match?.[1] ?? "";
}

const CARD_ELEVATED_MD = ":::card{.elevated}\n卡片内容示例文字。\n:::";
const CARD_OUTLINED_MD = ":::card{.outlined}\n卡片内容示例文字。\n:::";
const CARD_MINIMAL_MD = ":::card{.minimal}\n卡片内容示例文字。\n:::";
const CARD_DEFAULT_MD = ":::card\n卡片内容示例文字。\n:::";
const AUTHOR_CARD_CENTERED_MD = ":::author-card{.centered}\n张三 · 资深编辑\n:::";
const AUTHOR_CARD_MINIMAL_MD = ":::author-card{.minimal}\n张三 · 资深编辑\n:::";
const AUTHOR_CARD_DEFAULT_MD = ":::author-card\n张三 · 资深编辑\n:::";

describe("AC-001: card.elevated 渲染 root 含 box-shadow + 顶部色条 + 浅色背景", () => {
  it("root style 含 box-shadow 声明（低 alpha 经输出期 clamp-rgba-alpha 规则夹到最小可读值 0.15）", async () => {
    const result = await renderMarkdown(CARD_ELEVATED_MD, { themeId: "default" });
    const style = extractRootStyle(result.html, "card", "elevated");
    expect(style).toContain("box-shadow: 0 2px 10px rgba(0,0,0,0.15)");
  });

  it("root style 含顶部色条（border-top），覆盖块基线普通四边 border", async () => {
    const result = await renderMarkdown(CARD_ELEVATED_MD, { themeId: "default" });
    const style = extractRootStyle(result.html, "card", "elevated");
    expect(style).toContain("border-top: 3px solid #2d5a4e");
    expect(style).toContain("border: none");
  });

  it("root style 含浅色背景声明（token 解析为字面值，无 var( 残留）", async () => {
    const result = await renderMarkdown(CARD_ELEVATED_MD, { themeId: "default" });
    const style = extractRootStyle(result.html, "card", "elevated");
    expect(style).toContain("background-color: #faf8f5");
    expect(style).not.toContain("var(");
  });
});

describe("AC-002: card.outlined 渲染 root 含 1px 量级 border、不含 elevated 的阴影", () => {
  it("root style 含 1px 边框声明", async () => {
    const result = await renderMarkdown(CARD_OUTLINED_MD, { themeId: "default" });
    const style = extractRootStyle(result.html, "card", "outlined");
    expect(style).toContain("border: 1px solid #a8a29e");
  });

  it("root style 不含 box-shadow / border-top 声明（与 elevated 区分）", async () => {
    const result = await renderMarkdown(CARD_OUTLINED_MD, { themeId: "default" });
    const style = extractRootStyle(result.html, "card", "outlined");
    expect(style).not.toContain("box-shadow");
    expect(style).not.toContain("border-top");
  });
});

describe("AC-003: card.minimal 渲染 root 无 border/background 声明效果，保留 padding", () => {
  it("root style border 效果为 none（无可见边框）", async () => {
    const result = await renderMarkdown(CARD_MINIMAL_MD, { themeId: "default" });
    const style = extractRootStyle(result.html, "card", "minimal");
    expect(style).toContain("border: none");
    expect(style).toContain("border-radius: 0");
  });

  it("root style 无 background 相关声明", async () => {
    const result = await renderMarkdown(CARD_MINIMAL_MD, { themeId: "default" });
    const style = extractRootStyle(result.html, "card", "minimal");
    expect(style).not.toMatch(/background/);
  });

  it("root style 保留 padding 声明（块基线继承）", async () => {
    const result = await renderMarkdown(CARD_MINIMAL_MD, { themeId: "default" });
    const style = extractRootStyle(result.html, "card", "minimal");
    expect(style).toContain("padding: 16px");
  });
});

describe("AC-004: author-card.centered 渲染 root text-align:center", () => {
  it("root style 含 text-align: center", async () => {
    const result = await renderMarkdown(AUTHOR_CARD_CENTERED_MD, { themeId: "default" });
    const style = extractRootStyle(result.html, "author-card", "centered");
    expect(style).toContain("text-align: center");
  });

  it("root style 仍保留块基线 display/padding/background-color", async () => {
    const result = await renderMarkdown(AUTHOR_CARD_CENTERED_MD, { themeId: "default" });
    const style = extractRootStyle(result.html, "author-card", "centered");
    expect(style).toContain("display: table");
    expect(style).toContain("padding: 16px");
    expect(style).toContain("background-color: #f9f9f9");
  });
});

describe("AC-004: author-card.minimal 渲染 root 无 background-color/border-radius 效果，保留 padding", () => {
  it("root style background-color 效果为 transparent", async () => {
    const result = await renderMarkdown(AUTHOR_CARD_MINIMAL_MD, { themeId: "default" });
    const style = extractRootStyle(result.html, "author-card", "minimal");
    expect(style).toContain("background-color: transparent");
  });

  it("root style border-radius 效果为 0", async () => {
    const result = await renderMarkdown(AUTHOR_CARD_MINIMAL_MD, { themeId: "default" });
    const style = extractRootStyle(result.html, "author-card", "minimal");
    expect(style).toContain("border-radius: 0");
  });

  it("root style 保留 padding 声明（块基线继承）", async () => {
    const result = await renderMarkdown(AUTHOR_CARD_MINIMAL_MD, { themeId: "default" });
    const style = extractRootStyle(result.html, "author-card", "minimal");
    expect(style).toContain("padding: 16px");
  });
});

describe("merge 语义: getBlockBaseStyle 输出为块基线 ⊕ 变体 delta（源级 byte 保真）", () => {
  it("card.elevated", () => {
    expect(getBlockBaseStyle("card", "elevated")).toEqual({
      border: "none",
      "border-top": "3px solid var(--color-brand)",
      "border-radius": "8px",
      padding: "16px",
      margin: "12px 0",
      "background-color": "var(--color-background)",
      "box-shadow": "0 2px 10px rgba(0,0,0,0.06)",
    });
  });

  it("card.outlined", () => {
    expect(getBlockBaseStyle("card", "outlined")).toEqual({
      border: "1px solid var(--color-border-strong)",
      "border-radius": "0",
      padding: "16px",
      margin: "12px 0",
      "background-color": "transparent",
    });
  });

  it("card.minimal", () => {
    expect(getBlockBaseStyle("card", "minimal")).toEqual({
      border: "none",
      "border-radius": "0",
      padding: "16px",
      margin: "12px 0",
    });
  });

  it("author-card.centered", () => {
    expect(getBlockBaseStyle("author-card", "centered")).toEqual({
      display: "table",
      padding: "16px",
      margin: "16px 0",
      "border-radius": "8px",
      "background-color": "#f9f9f9",
      "text-align": "center",
    });
  });

  it("author-card.minimal（background-color/border-radius 被显式 reset，非删键）", () => {
    expect(getBlockBaseStyle("author-card", "minimal")).toEqual({
      display: "table",
      padding: "16px",
      margin: "16px 0",
      "border-radius": "0",
      "background-color": "transparent",
    });
  });
});

describe("AC-005: 5 变体满足 T-191 谓词①（getUnimplementedVariants 不含）+ T-192 差分守卫不 finding", () => {
  const TARGET_KEYS = [
    "card::elevated",
    "card::outlined",
    "card::minimal",
    "author-card::centered",
    "author-card::minimal",
  ];

  it("getUnimplementedVariants() 不含目标 5 变体", () => {
    const unimplementedKeys = new Set(
      getUnimplementedVariants().map((v) => `${v.blockId}::${v.variantId}`)
    );
    for (const key of TARGET_KEYS) {
      expect(unimplementedKeys.has(key)).toBe(false);
    }
  });

  it("runVariantDiffGuard 对目标 5 变体不产生 finding（root 渲染与 default 存在真实差异）", async () => {
    const findings = await runVariantDiffGuard({
      buildMarkdown: buildDirectiveMarkdown,
      themeId: "default",
    });
    const findingKeys = new Set(findings.map((f) => `${f.blockId}::${f.variantId}`));
    for (const key of TARGET_KEYS) {
      expect(findingKeys.has(key)).toBe(false);
    }
  });
});

describe("回归: card/author-card default 渲染不受影响", () => {
  it("card 裸指令 root style 与既有基线一致", async () => {
    const result = await renderMarkdown(CARD_DEFAULT_MD, { themeId: "default" });
    const style = extractRootStyle(result.html, "card", "default");
    expect(style).toContain("border: 1px solid #e0e0e0");
    expect(style).toContain("border-radius: 8px");
    expect(style).toContain("padding: 16px");
    expect(style).toContain("margin: 12px 0");
  });

  it("author-card 裸指令 root style 与既有基线一致", async () => {
    const result = await renderMarkdown(AUTHOR_CARD_DEFAULT_MD, { themeId: "default" });
    const style = extractRootStyle(result.html, "author-card", "default");
    expect(style).toContain("display: table");
    expect(style).toContain("padding: 16px");
    expect(style).toContain("margin: 16px 0");
    expect(style).toContain("border-radius: 8px");
    expect(style).toContain("background-color: #f9f9f9");
  });
});
