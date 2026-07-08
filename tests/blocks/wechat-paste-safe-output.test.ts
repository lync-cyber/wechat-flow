import type { Element, Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { beforeAll, describe, expect, it } from "vitest";
import {
  WECHAT_PASTE_STRIPPED_STYLE_PROPS,
  WECHAT_PASTE_UNSAFE_TAGS,
} from "../../packages/contracts/src/index.ts";
import { listBlocks, registerTheme, renderMarkdown } from "../../packages/core/src/index.ts";
import "../../packages/blocks/src/index.ts";
import defaultTheme from "../../packages/themes/default/src/index.ts";

beforeAll(() => {
  registerTheme(defaultTheme);
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

interface DirectiveContent {
  attrs?: string;
  body?: string;
}

const DEFAULT_DIRECTIVE_BODY = "这是用于微信粘贴安全校验的示例正文内容。";

const DIRECTIVE_CONTENT_BY_BLOCK: Record<string, (variantId: string) => DirectiveContent> = {
  gallery: () => ({
    body: [
      '- ![图一](https://example.com/1.png "示例说明一")',
      '- ![图二](https://example.com/2.png "示例说明二")',
      '- ![图三](https://example.com/3.png "示例说明三")',
    ].join("\n"),
  }),
  steps: () => ({
    body: [
      "- **第一步**：完成准备工作",
      "- **第二步**：执行核心操作",
      "- **第三步**：验收交付结果",
    ].join("\n"),
  }),
  compare: (variantId) =>
    variantId === "ledger"
      ? {
          attrs:
            ' left-label="优点" left-value="速度快" right-label="缺点" right-value="成本高" title="方案对比"',
        }
      : { body: "**方案 A** 与 **方案 B** 的对比说明文字。" },
  dialog: () => ({ attrs: ' speaker="测试对象"', body: "这是一轮对话内容示例。" }),
  "pull-quote": (variantId) =>
    variantId === "decorated"
      ? { attrs: ' author="测试作者"', body: "这句话值得被单独强调。" }
      : { body: "这句话值得被单独强调。" },
};

function synthesizeDirectiveContent(blockId: string, variantId: string): DirectiveContent {
  const builder = DIRECTIVE_CONTENT_BY_BLOCK[blockId];
  if (builder) return builder(variantId);
  return { body: DEFAULT_DIRECTIVE_BODY };
}

function buildDirectiveMarkdown(blockId: string, variantId: string): string {
  const { attrs = "", body } = synthesizeDirectiveContent(blockId, variantId);
  const header = `:::${blockId}{.${variantId}${attrs}}`;
  return body ? `${header}\n${body}\n:::` : `${header}\n:::`;
}

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
