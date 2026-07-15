import type { Element, Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { beforeAll, describe, expect, it } from "vitest";
import {
  INTENTIONAL_PLAIN_VARIANTS,
  describeBlock,
  getUnimplementedVariants,
  registerTheme,
  renderMarkdown,
  runVariantDiffGuard,
} from "../../packages/core/src/index.ts";
import "../../packages/blocks/src/index.ts";
import defaultTheme from "../../packages/themes/default/src/index.ts";
import techTheme from "../../packages/themes/tech/src/index.ts";
import { buildDirectiveMarkdown } from "./directive-markdown-fixtures.ts";

const GAP_VARIANT_IDS = ["bordered", "centered", "filled", "minimal", "italic", "card"] as const;

const EXPECTED_LARGE_QUOTE_MARK_HTML =
  '<section data-block="quote" data-variant="large-quote-mark" style="color: #555; margin: 16px 0; padding: 8px 16px"><p style="color: #555; font-size: 15px; font-weight: 400; line-height: 1.85; margin: 0 0 12px; text-align: left"><span style="color: #2d5a4e; display: inline-block; font-size: 32px; line-height: 0.6; margin-right: 4px; opacity: 0.4; text-align: left; vertical-align: top">"</span>这是用于微信粘贴安全校验的示例正文内容。</p></section>';

const EXPECTED_DROPCAP_HTML =
  '<section data-block="quote" data-variant="dropcap" style="color: #555; margin: 16px 0; padding: 8px 16px"><section style="color: #555; display: table; font-size: 15px; line-height: 1.85; text-align: left; width: 100%"><section style="color: #2d5a4e; display: table-cell; font-size: 35.2px; font-weight: 700; line-height: 1; padding-right: 8px; text-align: left; vertical-align: top; white-space: nowrap; width: 1%">这</section><p style="color: #555; font-size: 15px; font-weight: 400; line-height: 1.85; margin: 0 0 12px; text-align: left; display: table-cell; vertical-align: top">是用于微信粘贴安全校验的示例正文内容。</p></section></section>';

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

async function renderQuote(
  variantId: string,
  themeId = "default"
): Promise<{ elements: Element[]; root: Element | undefined }> {
  const { html } = await renderMarkdown(buildDirectiveMarkdown("quote", variantId), {
    themeId,
  });
  const tree = fromHtml(html, { fragment: true });
  const elements = collectElements(tree);
  const root = elements.find(
    (el) => el.properties?.dataBlock === "quote" && el.properties?.dataVariant === variantId
  );
  return { elements, root };
}

function hasBorderDeclaration(style: Record<string, string>): boolean {
  return ["border", "border-top", "border-bottom", "border-left", "border-right"].some((key) => {
    const value = style[key];
    return Boolean(value) && value.toLowerCase() !== "none";
  });
}

function findElementWithText(elements: Element[], text: string): Element | undefined {
  return elements.find((el) =>
    el.children.some((child) => child.type === "text" && child.value === text)
  );
}

describe("AC-001: bordered 渲染双层边框视觉 + byline 装饰节点注入", () => {
  it("root 自带独立 border 声明（外层边框），且至少一个非 root 后代元素也携带独立 border 声明（内层边框），构成双层边框", async () => {
    const { elements, root } = await renderQuote("bordered");
    expect(root).toBeDefined();

    const rootStyle = parseStyleDict(root?.properties?.style);
    expect(hasBorderDeclaration(rootStyle)).toBe(true);

    const descendantsWithBorder = elements.filter(
      (el) => el !== root && hasBorderDeclaration(parseStyleDict(el.properties?.style))
    );
    expect(descendantsWithBorder.length).toBeGreaterThan(0);
  });

  it("渲染产物文本含 byline 破折号，且该节点携带独立 border 声明（byline slot 样式落地）", async () => {
    const { elements, root } = await renderQuote("bordered");
    const byline = findElementWithText(elements, "——");
    expect(byline).toBeDefined();
    expect(byline).not.toBe(root);
    const bylineStyle = parseStyleDict(byline?.properties?.style);
    expect(hasBorderDeclaration(bylineStyle)).toBe(true);
  });
});

describe("AC-001: centered 渲染居中效果 + 装饰引号字符节点", () => {
  it("渲染产物中存在计算 text-align 等于 center 的元素", async () => {
    const { elements } = await renderQuote("centered");
    const centered = elements.some(
      (el) => parseStyleDict(el.properties?.style)["text-align"] === "center"
    );
    expect(centered).toBe(true);
  });

  it("渲染产物文本含引号装饰字符“，且该节点携带非空 color 声明", async () => {
    const { elements } = await renderQuote("centered");
    const mark = findElementWithText(elements, "“");
    expect(mark).toBeDefined();
    const style = parseStyleDict(mark?.properties?.style);
    expect(style.color).toBeTruthy();
  });
});

describe("AC-001: centered 装饰引号颜色跟随主题品牌色", () => {
  it("default 与 tech 两主题渲染的引号装饰节点计算 color 不同，证明颜色由主题 brand token 解析而非硬编码字面值", async () => {
    const { elements: defaultElements } = await renderQuote("centered", "default");
    const { elements: techElements } = await renderQuote("centered", "tech");

    const defaultMark = findElementWithText(defaultElements, "“");
    const techMark = findElementWithText(techElements, "“");

    const defaultColor = parseStyleDict(defaultMark?.properties?.style).color;
    const techColor = parseStyleDict(techMark?.properties?.style).color;

    expect(defaultColor).toBeTruthy();
    expect(techColor).toBeTruthy();
    expect(defaultColor).not.toBe(techColor);
  });
});

describe("AC-001: card 渲染卡片化声明 + 装饰节点注入", () => {
  it("root 含卡片声明——border / box-shadow / background(-color) 中至少一项非空且非 none", async () => {
    const { root } = await renderQuote("card");
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    const cardish = ["border", "box-shadow", "background", "background-color"].some((key) => {
      const value = style[key];
      return Boolean(value) && value.toLowerCase() !== "none";
    });
    expect(cardish).toBe(true);
  });

  it("渲染产物文本含卡片化引号装饰字符❝，且该节点携带非空 color 声明", async () => {
    const { elements } = await renderQuote("card");
    const mark = findElementWithText(elements, "❝");
    expect(mark).toBeDefined();
    const style = parseStyleDict(mark?.properties?.style);
    expect(style.color).toBeTruthy();
  });
});

describe("AC-002: filled 渲染浅底背景 + border-left 宽度大于 default 的 3px", () => {
  it("root 含 background 或 background-color 声明（非 none/transparent）", async () => {
    const { root } = await renderQuote("filled");
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    const filled = ["background", "background-color"].some((key) => {
      const value = style[key];
      return Boolean(value) && !["none", "transparent"].includes(value.toLowerCase());
    });
    expect(filled).toBe(true);
  });

  it("root border-left 像素宽度大于 default 的 3px", async () => {
    const { root } = await renderQuote("filled");
    const style = parseStyleDict(root?.properties?.style);
    const match = style["border-left"]?.match(/^(\d+(?:\.\d+)?)px/);
    const width = match ? Number(match[1]) : 0;
    expect(width).toBeGreaterThan(3);
  });
});

describe("AC-003: minimal 渲染不含 border-left 声明，保留 padding/margin", () => {
  it("root 样式不含 border-left 声明，且保留 padding 与 margin 声明", async () => {
    const { root } = await renderQuote("minimal");
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    expect(style["border-left"]).toBeUndefined();
    expect(style.padding).toBeDefined();
    expect(style.margin).toBeDefined();
  });

  it("minimal 变体在注册表中具备诚实的实现标记（自身 baseStyle delta 或 intentional-plain-variants 登记），不仅依赖块级 decorate 兜底豁免 T-191 谓词", () => {
    const def = describeBlock("quote");
    const variant = def?.variants.find((v) => v.id === "minimal");
    const hasOwnDelta = Boolean(
      variant?.baseStyle &&
        Object.values(variant.baseStyle).some((slot) => Object.keys(slot).length > 0)
    );
    const isAllowlisted = INTENTIONAL_PLAIN_VARIANTS.has("quote::minimal");
    expect(hasOwnDelta || isAllowlisted).toBe(true);
  });
});

describe("AC-004: italic 渲染 font-style italic，不新增 font-family 声明", () => {
  it("渲染产物中存在计算 font-style 等于 italic 的元素", async () => {
    const { elements } = await renderQuote("italic");
    const italicized = elements.some(
      (el) => parseStyleDict(el.properties?.style)["font-style"] === "italic"
    );
    expect(italicized).toBe(true);
  });

  it("渲染产物中任何元素均不含 font-family 声明", async () => {
    const { elements } = await renderQuote("italic");
    const hasFontFamily = elements.some((el) =>
      Object.hasOwn(parseStyleDict(el.properties?.style), "font-family")
    );
    expect(hasFontFamily).toBe(false);
  });
});

describe("AC-005: 6 项缺口变体满足 T-191 未实现谓词与 T-192 差分守卫", () => {
  it("getUnimplementedVariants() 不含 quote 的 6 项缺口变体", () => {
    const unimplemented = getUnimplementedVariants();
    for (const variantId of GAP_VARIANT_IDS) {
      const flagged = unimplemented.some((c) => c.blockId === "quote" && c.variantId === variantId);
      expect(flagged).toBe(false);
    }
  });

  it("runVariantDiffGuard 不将 quote 的 6 项缺口变体判定为渲染同 default 的 finding", async () => {
    const findings = await runVariantDiffGuard({
      buildMarkdown: buildDirectiveMarkdown,
      themeId: "default",
    });
    for (const variantId of GAP_VARIANT_IDS) {
      const flagged = findings.some((f) => f.blockId === "quote" && f.variantId === variantId);
      expect(flagged).toBe(false);
    }
  });
});

describe("AC-006: large-quote-mark/dropcap 渲染产物字节回归锁", () => {
  it("large-quote-mark 渲染产物字节与既有实现一致", async () => {
    const { html } = await renderMarkdown(buildDirectiveMarkdown("quote", "large-quote-mark"), {
      themeId: "default",
    });
    expect(html).toBe(EXPECTED_LARGE_QUOTE_MARK_HTML);
  });

  it("dropcap 渲染产物字节与既有实现一致", async () => {
    const { html } = await renderMarkdown(buildDirectiveMarkdown("quote", "dropcap"), {
      themeId: "default",
    });
    expect(html).toBe(EXPECTED_DROPCAP_HTML);
  });
});
