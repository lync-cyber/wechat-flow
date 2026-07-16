import type { Element, Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { beforeAll, describe, expect, it } from "vitest";
import {
  FORBIDDEN_CSS_PROPS,
  FORBIDDEN_DISPLAY_VALUES,
  WECHAT_PASTE_STRIPPED_STYLE_PROPS,
  WECHAT_PASTE_UNSAFE_TAGS,
  isForbiddenCssValue,
} from "../../packages/contracts/src/index.ts";
import {
  listBlocks,
  listThemes,
  registerTheme,
  renderMarkdown,
} from "../../packages/core/src/index.ts";
import "../../packages/blocks/src/index.ts";
import businessTheme from "../../packages/themes/business/src/index.ts";
import defaultTheme from "../../packages/themes/default/src/index.ts";
import literaryTheme from "../../packages/themes/literary/src/index.ts";
import magazineTheme from "../../packages/themes/magazine/src/index.ts";
import techTheme from "../../packages/themes/tech/src/index.ts";
import { buildDirectiveMarkdown } from "./directive-markdown-fixtures.ts";

const ALL_THEMES = [defaultTheme, literaryTheme, techTheme, businessTheme, magazineTheme];

beforeAll(() => {
  for (const theme of ALL_THEMES) {
    registerTheme(theme);
  }
});

describe("AC-001: WECHAT_PASTE_UNSAFE_TAGS 平台常量", () => {
  it("包含 div 作为微信粘贴会剥离样式的不安全容器标签", () => {
    expect(WECHAT_PASTE_UNSAFE_TAGS.has("div")).toBe(true);
  });

  it("是可用 has() 查询成员的集合结构（非字符串/数组占位）", () => {
    expect(typeof WECHAT_PASTE_UNSAFE_TAGS.has).toBe("function");
    expect(WECHAT_PASTE_UNSAFE_TAGS.size).toBeGreaterThanOrEqual(1);
  });
});

describe("AC-001: WECHAT_PASTE_STRIPPED_STYLE_PROPS 平台常量", () => {
  it.each(["position", "top", "right", "bottom", "left", "z-index", "float"])(
    "包含微信粘贴会剥离的 CSS 属性 '%s'",
    (prop) => {
      expect(WECHAT_PASTE_STRIPPED_STYLE_PROPS.has(prop)).toBe(true);
    }
  );
});

function collectElements(node: Root | Element): Element[] {
  const result: Element[] = [];
  for (const child of node.children) {
    if (child.type === "element") {
      const el = child as Element;
      result.push(el);
      result.push(...collectElements(el));
    }
  }
  return result;
}

function extractStyleProps(style: string): string[] {
  return style
    .split(";")
    .map((decl) => decl.trim())
    .filter((decl) => decl.length > 0)
    .map((decl) => decl.split(":")[0]?.trim().toLowerCase() ?? "");
}

interface StyleDeclaration {
  property: string;
  value: string;
}

function extractStyleDeclarations(style: string): StyleDeclaration[] {
  return style
    .split(";")
    .map((decl) => decl.trim())
    .filter((decl) => decl.length > 0)
    .map((decl) => {
      const idx = decl.indexOf(":");
      return {
        property: (idx === -1 ? decl : decl.slice(0, idx)).trim().toLowerCase(),
        value: (idx === -1 ? "" : decl.slice(idx + 1)).trim(),
      };
    });
}

function findForbiddenCssHits(elements: Element[]): string[] {
  const hits: string[] = [];
  for (const el of elements) {
    const style = el.properties?.style;
    if (typeof style !== "string" || style.length === 0) continue;
    for (const { property, value } of extractStyleDeclarations(style)) {
      if (FORBIDDEN_CSS_PROPS.has(property)) {
        hits.push(`${el.tagName}:${property}=${value}`);
        continue;
      }
      if (property === "display" && FORBIDDEN_DISPLAY_VALUES.has(value)) {
        hits.push(`${el.tagName}:${property}=${value}`);
        continue;
      }
      if (isForbiddenCssValue(`${property}: ${value}`)) {
        hits.push(`${el.tagName}:${property}=${value}`);
      }
    }
  }
  return hits;
}

const blockVariantCombos: Array<{ blockId: string; variantId: string }> = [];
for (const block of listBlocks()) {
  for (const variant of block.variants) {
    blockVariantCombos.push({ blockId: block.id, variantId: variant.id });
  }
}

describe("AC-002: 全部注册块 × 全部变体渲染产物对微信粘贴安全", () => {
  it("registry 至少含 25 个已注册块（数据驱动前提）", () => {
    expect(listBlocks().length).toBeGreaterThanOrEqual(25);
  });

  it.each(blockVariantCombos)(
    "block '$blockId' variant '$variantId' 渲染产物不含微信粘贴不安全标签且不含会被剥离的样式属性",
    async ({ blockId, variantId }) => {
      const markdown = buildDirectiveMarkdown(blockId, variantId);
      const { html } = await renderMarkdown(markdown, { themeId: "default" });
      const tree = fromHtml(html, { fragment: true });
      const elements = collectElements(tree);

      const unsafeTagHits = elements
        .filter((el) => WECHAT_PASTE_UNSAFE_TAGS.has(el.tagName))
        .map((el) => el.tagName);
      expect(unsafeTagHits, `block=${blockId} variant=${variantId}`).toEqual([]);

      const strippedPropHits: string[] = [];
      for (const el of elements) {
        const style = el.properties?.style;
        if (typeof style === "string" && style.length > 0) {
          for (const prop of extractStyleProps(style)) {
            if (WECHAT_PASTE_STRIPPED_STYLE_PROPS.has(prop)) {
              strippedPropHits.push(`${el.tagName}:${prop}`);
            }
          }
        }
      }
      expect(strippedPropHits, `block=${blockId} variant=${variantId}`).toEqual([]);
    }
  );
});

const themeBlockVariantCombos: Array<{ themeId: string; blockId: string; variantId: string }> = [];
for (const theme of ALL_THEMES) {
  for (const block of listBlocks()) {
    for (const variant of block.variants) {
      themeBlockVariantCombos.push({ themeId: theme.id, blockId: block.id, variantId: variant.id });
    }
  }
}

describe("AC-005: 全主题×全块×全变体渲染扫描 + 不安全标签扫描 + -webkit- 例外白名单", () => {
  it("已注册满 5 个内置主题（数据驱动前提）", () => {
    expect(listThemes().length).toBeGreaterThanOrEqual(5);
  });

  it.each(themeBlockVariantCombos)(
    "theme '$themeId' block '$blockId' variant '$variantId' 渲染产物不含 FORBIDDEN CSS 声明且不含不安全标签",
    async ({ themeId, blockId, variantId }) => {
      const markdown = buildDirectiveMarkdown(blockId, variantId);
      const { html } = await renderMarkdown(markdown, { themeId });
      const tree = fromHtml(html, { fragment: true });
      const elements = collectElements(tree);

      const unsafeTagHits = elements
        .filter((el) => WECHAT_PASTE_UNSAFE_TAGS.has(el.tagName))
        .map((el) => el.tagName);
      expect(unsafeTagHits, `theme=${themeId} block=${blockId} variant=${variantId}`).toEqual([]);

      const forbiddenCssHits = findForbiddenCssHits(elements);
      expect(forbiddenCssHits, `theme=${themeId} block=${blockId} variant=${variantId}`).toEqual(
        []
      );
    }
  );

  it("负向探针: 合成含 display:flex 的片段被 findForbiddenCssHits 判定为违规", () => {
    const tree = fromHtml('<span style="display:flex;color:#000">x</span>', {
      fragment: true,
    });
    const hits = findForbiddenCssHits(collectElements(tree));
    expect(hits).toContainEqual(expect.stringContaining("display=flex"));
  });

  it("负向探针: 合成含 position:absolute 的片段被 findForbiddenCssHits 判定为违规", () => {
    const tree = fromHtml('<span style="position:absolute;top:0">x</span>', {
      fragment: true,
    });
    const hits = findForbiddenCssHits(collectElements(tree));
    expect(hits.some((h) => h.includes("position=absolute"))).toBe(true);
  });

  it("负向探针: 合成含合法在用 -webkit-text-emphasis 声明的片段不被判定为违规（例外白名单放行）", () => {
    const tree = fromHtml(
      '<span style="text-emphasis: filled circle; -webkit-text-emphasis: filled circle">x</span>',
      { fragment: true }
    );
    const hits = findForbiddenCssHits(collectElements(tree));
    expect(hits).toEqual([]);
  });

  it("负向探针: 合成含合法 display:inline-block 声明的片段不被判定为违规", () => {
    const tree = fromHtml('<span style="display:inline-block;color:#000">x</span>', {
      fragment: true,
    });
    const hits = findForbiddenCssHits(collectElements(tree));
    expect(hits).toEqual([]);
  });
});
