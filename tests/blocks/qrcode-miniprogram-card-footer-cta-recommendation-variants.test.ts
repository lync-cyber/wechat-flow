import type { Element, Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { beforeEach, describe, expect, it } from "vitest";
import {
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

const QRCODE_CARD_MD = ":::qrcode{.card}\n慢读简报\n\n每周四，一封邮件，一组数据\n:::\n";

const MINIPROGRAM_MD = (variant: string): string =>
  `:::miniprogram-card{.${variant}}\n天气助手\n\n一键查看未来七日天气\n:::\n`;

const FOOTER_CTA_CENTERED_MD = ":::footer-cta{.centered}\n觉得有用？\n:::\n";
const FOOTER_CTA_FULL_WIDTH_MD = ":::footer-cta{.full-width}\n本期内容对你有帮助吗？\n:::\n";

const RECOMMENDATION_MD = (variant: string): string =>
  `:::recommendation{.${variant}}\n推荐阅读\n\n- [前作](#)\n- [续篇](#)\n:::\n`;

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

async function renderElements(markdown: string): Promise<Element[]> {
  const { html } = await renderMarkdown(markdown, { themeId: "default" });
  const tree = fromHtml(html, { fragment: true });
  return collectElements(tree);
}

function findRoot(elements: Element[], blockId: string, variantId: string): Element | undefined {
  return elements.find(
    (el) => el.properties?.dataBlock === blockId && el.properties?.dataVariant === variantId
  );
}

function findElementWithText(elements: Element[], text: string): Element | undefined {
  return elements.find((el) =>
    el.children.some((child) => child.type === "text" && child.value === text)
  );
}

function firstPxNumber(style: Record<string, string>, prop: string): number {
  const match = style[prop]?.match(/^(\d+(?:\.\d+)?)px/);
  expect(
    match,
    `property "${prop}" not found as px value in style: ${JSON.stringify(style)}`
  ).not.toBeNull();
  return Number.parseFloat(match?.[1] ?? "NaN");
}

function paddingFirstNumber(style: Record<string, string>): number {
  const match = style.padding?.match(/^(\d+(?:\.\d+)?)px/);
  expect(match, `padding not found as px value in style: ${JSON.stringify(style)}`).not.toBeNull();
  return Number.parseFloat(match?.[1] ?? "NaN");
}

describe("AC-001: qrcode.card 呈现左 QR + 右三行信息（kicker/标题/说明）并排结构", () => {
  it("root 呈 display:table 卡片布局", async () => {
    const elements = await renderElements(QRCODE_CARD_MD);
    const root = findRoot(elements, "qrcode", "card");
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    expect(style.display).toBe("table");
  });

  it("左侧 QR 占位 cell 呈 display:table-cell 且携带固定宽高", async () => {
    const elements = await renderElements(QRCODE_CARD_MD);
    const root = findRoot(elements, "qrcode", "card");
    const qrCell = root?.children.find(
      (child): child is Element =>
        child.type === "element" && parseStyleDict(child.properties?.style).width === "64px"
    );
    expect(qrCell).toBeDefined();
    const style = parseStyleDict(qrCell?.properties?.style);
    expect(style.display).toBe("table-cell");
    expect(style.height).toBe("64px");
  });

  it("右侧信息区呈 kicker/标题/说明三行，kicker 携带品牌色与加粗", async () => {
    const elements = await renderElements(QRCODE_CARD_MD);
    const kicker = findElementWithText(elements, "SUBSCRIBE");
    const title = findElementWithText(elements, "慢读简报");
    const desc = findElementWithText(elements, "每周四，一封邮件，一组数据");
    expect(kicker).toBeDefined();
    expect(title).toBeDefined();
    expect(desc).toBeDefined();

    const kickerStyle = parseStyleDict(kicker?.properties?.style);
    expect(kickerStyle.color).toBe("#2d5a4e");
    expect(kickerStyle["font-weight"]).toBe("700");

    const titleStyle = parseStyleDict(title?.properties?.style);
    expect(titleStyle["font-weight"]).toBe("700");

    const descStyle = parseStyleDict(desc?.properties?.style);
    expect(descStyle.color).toBe("#44403c");
  });
});

describe("AC-002: miniprogram-card.large 呈现图标 + 信息并排结构；compact padding < large", () => {
  it("large：root display:table，左图标 cell 48px，右信息区含标题/描述", async () => {
    const elements = await renderElements(MINIPROGRAM_MD("large"));
    const root = findRoot(elements, "miniprogram-card", "large");
    expect(root).toBeDefined();
    expect(parseStyleDict(root?.properties?.style).display).toBe("table");

    const iconCell = root?.children.find(
      (child): child is Element =>
        child.type === "element" && parseStyleDict(child.properties?.style).width === "48px"
    );
    expect(iconCell).toBeDefined();
    expect(parseStyleDict(iconCell?.properties?.style).display).toBe("table-cell");

    const title = findElementWithText(elements, "天气助手");
    const desc = findElementWithText(elements, "一键查看未来七日天气");
    expect(title).toBeDefined();
    expect(desc).toBeDefined();
    expect(parseStyleDict(title?.properties?.style)["font-weight"]).toBe("700");
  });

  it("compact：同构图标+信息并排结构", async () => {
    const elements = await renderElements(MINIPROGRAM_MD("compact"));
    const root = findRoot(elements, "miniprogram-card", "compact");
    expect(root).toBeDefined();
    expect(parseStyleDict(root?.properties?.style).display).toBe("table");
    const iconCell = root?.children.find(
      (child): child is Element =>
        child.type === "element" && parseStyleDict(child.properties?.style).width === "32px"
    );
    expect(iconCell).toBeDefined();
  });

  it("compact root padding 数值小于 large", async () => {
    const largeElements = await renderElements(MINIPROGRAM_MD("large"));
    const compactElements = await renderElements(MINIPROGRAM_MD("compact"));
    const largeRoot = findRoot(largeElements, "miniprogram-card", "large");
    const compactRoot = findRoot(compactElements, "miniprogram-card", "compact");
    const largePadding = paddingFirstNumber(parseStyleDict(largeRoot?.properties?.style));
    const compactPadding = paddingFirstNumber(parseStyleDict(compactRoot?.properties?.style));
    expect(compactPadding).toBeLessThan(largePadding);
  });
});

describe("AC-003: footer-cta.centered 居中标题 + 主色胶囊按钮；full-width 三栏动作满宽布局", () => {
  it("centered：root text-align:center，按钮元素 border-radius 高值 + background 品牌色", async () => {
    const elements = await renderElements(FOOTER_CTA_CENTERED_MD);
    const root = findRoot(elements, "footer-cta", "centered");
    expect(root).toBeDefined();
    expect(parseStyleDict(root?.properties?.style)["text-align"]).toBe("center");

    const button = findElementWithText(elements, "关注我");
    expect(button).toBeDefined();
    const buttonStyle = parseStyleDict(button?.properties?.style);
    expect(firstPxNumber(buttonStyle, "border-radius")).toBeGreaterThanOrEqual(20);
    expect(buttonStyle["background-color"]).toBe("#2d5a4e");
  });

  it("full-width：赞同/收藏/转发三栏同构、满宽 table 布局", async () => {
    const elements = await renderElements(FOOTER_CTA_FULL_WIDTH_MD);
    const like = findElementWithText(elements, "♡ 赞同");
    const star = findElementWithText(elements, "★ 收藏");
    const share = findElementWithText(elements, "↗ 转发");
    expect(like).toBeDefined();
    expect(star).toBeDefined();
    expect(share).toBeDefined();

    for (const cell of [like, star, share]) {
      expect(parseStyleDict(cell?.properties?.style).display).toBe("table-cell");
    }

    const starStyle = parseStyleDict(star?.properties?.style);
    expect(starStyle["background-color"]).toBe("#2d5a4e");

    const row = elements.find((el) =>
      el.children.some((child) => child === like || child === star || child === share)
    );
    const rowStyle = parseStyleDict(row?.properties?.style);
    expect(rowStyle.display).toBe("table");
    expect(rowStyle.width).toBe("100%");
  });
});

describe("AC-004: recommendation.card 粗体标题 + bullet 链接列表；compact 间距 < card", () => {
  it("card：标题加粗，列表项携带品牌色", async () => {
    const elements = await renderElements(RECOMMENDATION_MD("card"));
    const root = findRoot(elements, "recommendation", "card");
    expect(root).toBeDefined();
    expect(parseStyleDict(root?.properties?.style).border).toBeTruthy();

    const title = findElementWithText(elements, "推荐阅读");
    expect(title).toBeDefined();
    expect(parseStyleDict(title?.properties?.style)["font-weight"]).toBe("700");

    const firstItemLink = findElementWithText(elements, "前作");
    expect(firstItemLink).toBeDefined();
    const item = elements.find((el) => el.children.includes(firstItemLink as Element));
    expect(parseStyleDict(item?.properties?.style).color).toBe("#2d5a4e");
  });

  it("compact：列表项 margin-bottom 数值小于 card", async () => {
    const cardElements = await renderElements(RECOMMENDATION_MD("card"));
    const compactElements = await renderElements(RECOMMENDATION_MD("compact"));

    const cardLink = findElementWithText(cardElements, "前作");
    const compactLink = findElementWithText(compactElements, "前作");
    const cardItem = cardElements.find((el) => el.children.includes(cardLink as Element));
    const compactItem = compactElements.find((el) => el.children.includes(compactLink as Element));
    const cardMargin = firstPxNumber(parseStyleDict(cardItem?.properties?.style), "margin-bottom");
    const compactMargin = firstPxNumber(
      parseStyleDict(compactItem?.properties?.style),
      "margin-bottom"
    );
    expect(compactMargin).toBeLessThan(cardMargin);
  });
});

describe("AC-005: 7 项营销工具卡片变体满足 T-191 谓词与 T-192 差分守卫", () => {
  const TARGET_KEYS = [
    "qrcode::card",
    "miniprogram-card::large",
    "miniprogram-card::compact",
    "footer-cta::centered",
    "footer-cta::full-width",
    "recommendation::card",
    "recommendation::compact",
  ];

  it("getUnimplementedVariants() 不含目标 7 变体", () => {
    const unimplementedKeys = new Set(
      getUnimplementedVariants().map((v) => `${v.blockId}::${v.variantId}`)
    );
    for (const key of TARGET_KEYS) {
      expect(unimplementedKeys.has(key)).toBe(false);
    }
  });

  it("runVariantDiffGuard 对目标 7 变体不产生 finding", async () => {
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
