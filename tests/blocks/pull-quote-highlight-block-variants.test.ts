import type { Element, Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { beforeAll, describe, expect, it } from "vitest";
import {
  getUnimplementedVariants,
  registerTheme,
  renderMarkdown,
  runVariantDiffGuard,
} from "../../packages/core/src/index.ts";
import "../../packages/blocks/src/index.ts";
import defaultTheme from "../../packages/themes/default/src/index.ts";
import techTheme from "../../packages/themes/tech/src/index.ts";
import { buildDirectiveMarkdown } from "./directive-markdown-fixtures.ts";

const PULL_QUOTE_GAP_VARIANT_IDS = ["large", "minimal", "bordered"] as const;
const HIGHLIGHT_BLOCK_GAP_VARIANT_IDS = ["underline", "bold", "background"] as const;

const EXPECTED_DECORATED_HTML =
  '<section data-block="pull-quote" data-variant="decorated" style="font-size: 20px; margin: 24px 0; padding: 24px 16px; text-align: center"><p style="color: #1c1917; font-size: 20px; font-weight: 400; line-height: 1.85; margin: 0 0 12px; text-align: center"><span style="color: #2d5a4e; display: inline-block; font-size: 28px; line-height: 1; opacity: 0.35; text-align: center; vertical-align: top">「</span>这句话值得被单独强调。</p><section style="color: #78716c; font-size: 14px; line-height: 1.85; margin-top: 10px; text-align: center">—— 测试作者</section></section>';

beforeAll(() => {
  registerTheme(defaultTheme);
  registerTheme(techTheme);
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

function parseStyleDict(style: unknown): Record<string, string> {
  const dict: Record<string, string> = {};
  if (typeof style !== "string") return dict;
  for (const decl of style.split(";")) {
    const trimmed = decl.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    dict[trimmed.slice(0, idx).trim().toLowerCase()] = trimmed.slice(idx + 1).trim();
  }
  return dict;
}

function findElementWithText(elements: Element[], text: string): Element | undefined {
  return elements.find((el) =>
    el.children.some((child) => child.type === "text" && child.value === text)
  );
}

async function renderBlock(
  blockId: string,
  variantId: string,
  themeId = "default"
): Promise<{ elements: Element[]; root: Element | undefined }> {
  const { html } = await renderMarkdown(buildDirectiveMarkdown(blockId, variantId), { themeId });
  const tree = fromHtml(html, { fragment: true });
  const elements = collectElements(tree);
  const root = elements.find(
    (el) => el.properties?.dataBlock === blockId && el.properties?.dataVariant === variantId
  );
  return { elements, root };
}

async function renderCustom(
  markdown: string,
  themeId = "default"
): Promise<{ html: string; elements: Element[] }> {
  const { html } = await renderMarkdown(markdown, { themeId });
  const tree = fromHtml(html, { fragment: true });
  return { html, elements: collectElements(tree) };
}

describe("AC-001: pull-quote.large 渲染装饰引号节点 + root text-align:left + 大字号", () => {
  it("root 计算 text-align 等于 left（非 default 的 center）", async () => {
    const { root } = await renderBlock("pull-quote", "large");
    expect(root).toBeDefined();
    expect(parseStyleDict(root?.properties?.style)["text-align"]).toBe("left");
  });

  it("root 计算字号大于正文基础字号 15px", async () => {
    const { root } = await renderBlock("pull-quote", "large");
    const size = Number.parseFloat(parseStyleDict(root?.properties?.style)["font-size"] ?? "0");
    expect(size).toBeGreaterThan(15);
  });

  it("渲染产物含装饰引号文本字符「，且该节点携带非空 color 声明", async () => {
    const { elements } = await renderBlock("pull-quote", "large");
    const mark = findElementWithText(elements, "「");
    expect(mark).toBeDefined();
    expect(parseStyleDict(mark?.properties?.style).color).toBeTruthy();
  });
});

describe("AC-001: pull-quote.large 装饰引号颜色跟随主题品牌色", () => {
  it("default 与 tech 两主题渲染的引号装饰节点计算 color 不同，证明颜色由主题 brand token 解析", async () => {
    const { elements: defaultElements } = await renderBlock("pull-quote", "large", "default");
    const { elements: techElements } = await renderBlock("pull-quote", "large", "tech");

    const defaultMark = findElementWithText(defaultElements, "「");
    const techMark = findElementWithText(techElements, "「");

    const defaultColor = parseStyleDict(defaultMark?.properties?.style).color;
    const techColor = parseStyleDict(techMark?.properties?.style).color;

    expect(defaultColor).toBeTruthy();
    expect(techColor).toBeTruthy();
    expect(defaultColor).not.toBe(techColor);
  });
});

describe("AC-002: pull-quote.minimal 渲染上下细线 + 居中 kicker，不含 decorated 的引号装饰节点", () => {
  it("root 同时携带 border-top 与 border-bottom 声明", async () => {
    const { root } = await renderBlock("pull-quote", "minimal");
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    expect(style["border-top"]).toBeTruthy();
    expect(style["border-bottom"]).toBeTruthy();
  });

  it("渲染产物含 kicker 文本节点，且计算 text-align 等于 center", async () => {
    const { elements } = await renderBlock("pull-quote", "minimal");
    const kicker = findElementWithText(elements, "QUOTE · 引言");
    expect(kicker).toBeDefined();
    expect(parseStyleDict(kicker?.properties?.style)["text-align"]).toBe("center");
  });

  it("渲染产物不含 decorated 变体使用的引号装饰字符「", async () => {
    const { elements } = await renderBlock("pull-quote", "minimal");
    expect(findElementWithText(elements, "「")).toBeUndefined();
  });
});

describe("AC-003: pull-quote.bordered 渲染双行夹注结构 + 上下朱色细线", () => {
  it("root 同时携带 border-top 与 border-bottom 声明（无需 author 属性即生效）", async () => {
    const { root } = await renderBlock("pull-quote", "bordered");
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    expect(style["border-top"]).toBeTruthy();
    expect(style["border-bottom"]).toBeTruthy();
  });

  it("传入 author 属性时，渲染产物含两处承载该 author 文本的独立元素，分别位于正文段落前后（双行夹注）", async () => {
    const { elements } = await renderCustom(
      ':::pull-quote{.bordered author="逝者如斯"}\n这句话值得被单独强调。\n:::'
    );
    const glossNodes = elements.filter((el) =>
      el.children.some((child) => child.type === "text" && child.value === "—— 逝者如斯")
    );
    expect(glossNodes).toHaveLength(2);

    const paragraphIndex = elements.findIndex((el) => el.tagName === "p");
    const glossIndices = glossNodes.map((node) => elements.indexOf(node));
    expect(Math.min(...glossIndices)).toBeLessThan(paragraphIndex);
    expect(Math.max(...glossIndices)).toBeGreaterThan(paragraphIndex);
  });

  it("上下细线颜色跟随主题强调色（default 与 tech 主题计算 border-top 声明不同）", async () => {
    const { root: defaultRoot } = await renderBlock("pull-quote", "bordered", "default");
    const { root: techRoot } = await renderBlock("pull-quote", "bordered", "tech");
    const defaultBorder = parseStyleDict(defaultRoot?.properties?.style)["border-top"];
    const techBorder = parseStyleDict(techRoot?.properties?.style)["border-top"];
    expect(defaultBorder).toBeTruthy();
    expect(techBorder).toBeTruthy();
    expect(defaultBorder).not.toBe(techBorder);
  });
});

describe("AC-004: highlight-block 3 变体渲染产物", () => {
  it("underline root 含底部点状下划线声明（border-bottom 含 dotted）", async () => {
    const { root } = await renderBlock("highlight-block", "underline");
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    expect(style["border-bottom"]?.toLowerCase()).toContain("dotted");
  });

  it("underline root 含中性底色声明（background-color 非 none/transparent）", async () => {
    const { root } = await renderBlock("highlight-block", "underline");
    const style = parseStyleDict(root?.properties?.style);
    const value = style["background-color"];
    expect(value).toBeTruthy();
    expect(["none", "transparent"]).not.toContain(value?.toLowerCase());
  });

  it("bold root 含加粗字重声明", async () => {
    const { root } = await renderBlock("highlight-block", "bold");
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    const weight = style["font-weight"];
    expect(weight).toBeTruthy();
    const numeric = Number.parseInt(weight ?? "0", 10);
    expect(weight === "bold" || numeric >= 700).toBe(true);
  });

  it("bold root 含 letter-spacing 加大声明（数值大于 0）", async () => {
    const { root } = await renderBlock("highlight-block", "bold");
    const style = parseStyleDict(root?.properties?.style);
    const value = Number.parseFloat(style["letter-spacing"] ?? "0");
    expect(value).toBeGreaterThan(0);
  });

  it("background root 含米黄色系背景色声明（background-color 非 none/transparent）", async () => {
    const { root } = await renderBlock("highlight-block", "background");
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    const value = style["background-color"];
    expect(value).toBeTruthy();
    expect(["none", "transparent"]).not.toContain(value?.toLowerCase());
  });

  it("background root line-height 大于主题正文基线 1.85", async () => {
    const { root } = await renderBlock("highlight-block", "background");
    const style = parseStyleDict(root?.properties?.style);
    const value = Number.parseFloat(style["line-height"] ?? "0");
    expect(value).toBeGreaterThan(1.85);
  });
});

describe("AC-005: 6 项缺口变体满足谓词①或②，差分守卫不判定为 finding；pull-quote.decorated 渲染产物字节不受本卡影响", () => {
  it("getUnimplementedVariants() 不含本卡 6 项缺口变体", () => {
    const unimplemented = getUnimplementedVariants();
    for (const variantId of PULL_QUOTE_GAP_VARIANT_IDS) {
      const flagged = unimplemented.some(
        (c) => c.blockId === "pull-quote" && c.variantId === variantId
      );
      expect(flagged).toBe(false);
    }
    for (const variantId of HIGHLIGHT_BLOCK_GAP_VARIANT_IDS) {
      const flagged = unimplemented.some(
        (c) => c.blockId === "highlight-block" && c.variantId === variantId
      );
      expect(flagged).toBe(false);
    }
  });

  it("runVariantDiffGuard 不将本卡 6 项缺口变体判定为渲染同 default 的 finding", async () => {
    const findings = await runVariantDiffGuard({
      buildMarkdown: buildDirectiveMarkdown,
      themeId: "default",
    });
    for (const variantId of PULL_QUOTE_GAP_VARIANT_IDS) {
      const flagged = findings.some((f) => f.blockId === "pull-quote" && f.variantId === variantId);
      expect(flagged).toBe(false);
    }
    for (const variantId of HIGHLIGHT_BLOCK_GAP_VARIANT_IDS) {
      const flagged = findings.some(
        (f) => f.blockId === "highlight-block" && f.variantId === variantId
      );
      expect(flagged).toBe(false);
    }
  });

  it("pull-quote.decorated 渲染产物字节与既有实现一致", async () => {
    const { html } = await renderMarkdown(buildDirectiveMarkdown("pull-quote", "decorated"), {
      themeId: "default",
    });
    expect(html).toBe(EXPECTED_DECORATED_HTML);
  });
});
