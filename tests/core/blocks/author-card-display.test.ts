import { beforeEach, describe, expect, it } from "vitest";
import {
  registerTheme,
  renderMarkdown,
  resetBlockRegistry,
  resetThemeRegistry,
  resetVariantRegistry,
} from "../../../packages/core/src/index.ts";
import "../../../packages/blocks/src/index.ts";
import businessTheme from "../../../packages/themes/business/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";
import literaryTheme from "../../../packages/themes/literary/src/index.ts";
import magazineTheme from "../../../packages/themes/magazine/src/index.ts";
import techTheme from "../../../packages/themes/tech/src/index.ts";

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
  resetThemeRegistry();
  registerTheme(defaultTheme);
  registerTheme(literaryTheme);
  registerTheme(techTheme);
  registerTheme(businessTheme);
  registerTheme(magazineTheme);
});

const ALL_THEME_IDS = ["default", "literary", "tech", "business", "magazine"];

const AUTHOR_CARD_MD = ":::author-card\n张三 · 资深编辑\n:::";

function extractAuthorCardStyle(html: string): string {
  const match = html.match(
    /<section data-block="author-card" data-variant="default"[^>]* style="([^"]*)"/
  );
  expect(match, `no author-card root found in html: ${html}`).not.toBeNull();
  return match?.[1] ?? "";
}

describe("AC-003: author-card 根容器 display 由 flex 迁移为 table（微信粘贴安全布局）", () => {
  for (const themeId of ALL_THEME_IDS) {
    it(`${themeId} 主题渲染 author-card 根容器计算 display = table`, async () => {
      const result = await renderMarkdown(AUTHOR_CARD_MD, { themeId });
      const style = extractAuthorCardStyle(result.html);
      expect(style).toContain("display: table");
    });

    it(`${themeId} 主题渲染 author-card 根容器 display 不为 flex`, async () => {
      const result = await renderMarkdown(AUTHOR_CARD_MD, { themeId });
      const style = extractAuthorCardStyle(result.html);
      expect(style).not.toMatch(/display:\s*flex/);
    });
  }

  it("author-card 根容器仍保留 padding/margin/border-radius/background-color 等非 display-model 相关声明（视觉迁移非整体重写）", async () => {
    const result = await renderMarkdown(AUTHOR_CARD_MD, { themeId: "default" });
    const style = extractAuthorCardStyle(result.html);
    expect(style).toContain("padding: 16px");
    expect(style).toContain("margin: 16px 0");
    expect(style).toContain("border-radius: 8px");
    expect(style).toContain("background-color: #f9f9f9");
  });
});
