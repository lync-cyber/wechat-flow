import type { Element, Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { beforeEach, describe, expect, it } from "vitest";
import {
  describeBlock,
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
import { DEFAULT_DIRECTIVE_BODY, buildDirectiveMarkdown } from "./directive-markdown-fixtures.ts";

const ICON_LEFT_GLYPH = "◆";

const TARGET_VARIANTS: Array<{ blockId: string; variantId: string }> = [
  { blockId: "related-cards", variantId: "compact" },
  { blockId: "related-cards", variantId: "grid" },
  { blockId: "social-cta", variantId: "icon-left" },
  { blockId: "social-cta", variantId: "full-width" },
  { blockId: "subscribe-cta", variantId: "banner" },
  { blockId: "advert-card", variantId: "minimal" },
];

const RELATED_CARDS_MD = (variant: string): string =>
  [
    `:::related-cards{.${variant}}`,
    "- [文章一](#)",
    "- [文章二](#)",
    "- [文章三](#)",
    "- [文章四](#)",
    ":::",
    "",
  ].join("\n");

function localBuildMarkdown(blockId: string, variantId: string): string {
  if (blockId === "related-cards") return RELATED_CARDS_MD(variantId);
  return buildDirectiveMarkdown(blockId, variantId);
}

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
  resetThemeRegistry();
  registerTheme(defaultTheme);
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

function styleOf(el: Element | undefined): Record<string, string> {
  return parseStyleDict(el?.properties?.style);
}

function findElementWithText(elements: Element[], text: string): Element | undefined {
  return elements.find((el) =>
    el.children.some((child) => child.type === "text" && child.value === text)
  );
}

function findElementsContainingText(elements: Element[], text: string): Element[] {
  return elements.filter((el) =>
    el.children.some((child) => child.type === "text" && child.value.includes(text))
  );
}

function maxPxValue(value: string | undefined): number {
  if (!value) return 0;
  const nums = [...value.matchAll(/([\d.]+)px/g)].map((m) => Number.parseFloat(m[1] ?? "0"));
  return nums.length > 0 ? Math.max(...nums) : 0;
}

async function renderBlock(
  blockId: string,
  variantId: string,
  themeId = "default"
): Promise<{ elements: Element[]; root: Element | undefined; html: string }> {
  const { html } = await renderMarkdown(localBuildMarkdown(blockId, variantId), { themeId });
  const tree = fromHtml(html, { fragment: true });
  const elements = collectElements(tree);
  const root = elements.find(
    (el) => el.properties?.dataBlock === blockId && el.properties?.dataVariant === variantId
  );
  return { elements, root, html };
}

describe("AC-001: related-cards.compact padding/margin 小于 default", () => {
  it("padding 与 margin 的最大像素值均小于 default", async () => {
    const { root: defaultRoot } = await renderBlock("related-cards", "default");
    const { root: compactRoot } = await renderBlock("related-cards", "compact");
    expect(maxPxValue(styleOf(compactRoot).padding)).toBeLessThan(
      maxPxValue(styleOf(defaultRoot).padding)
    );
    expect(maxPxValue(styleOf(compactRoot).margin)).toBeLessThan(
      maxPxValue(styleOf(defaultRoot).margin)
    );
  });
});

describe("AC-001: related-cards.grid 呈现逐项独立 chrome（border）+ table-cell 双列网格", () => {
  it("root 呈现 table 网格容器（display:table）", async () => {
    const { root } = await renderBlock("related-cards", "grid");
    expect(styleOf(root).display).toBe("table");
  });

  it("含 2 个 table-row 与 4 个 table-cell，每个 cell 各带 1px border chrome", async () => {
    const { elements } = await renderBlock("related-cards", "grid");
    const rows = elements.filter((el) => styleOf(el).display === "table-row");
    const cells = elements.filter((el) => styleOf(el).display === "table-cell");
    expect(rows.length).toBe(2);
    expect(cells.length).toBe(4);
    for (const cell of cells) {
      expect(styleOf(cell).border).toContain("1px solid");
      expect(styleOf(cell).width).toBe("50%");
    }
  });
});

describe("AC-002: social-cta.icon-left 呈现 pill 形态 + 图标元素 + 灰字文本", () => {
  it("root border-radius 高于 default（pill 形态）", async () => {
    const { root: defaultRoot } = await renderBlock("social-cta", "default");
    const { root: iconRoot } = await renderBlock("social-cta", "icon-left");
    const defaultRadius = Number.parseFloat(styleOf(defaultRoot)["border-radius"] ?? "0");
    const iconRadius = Number.parseFloat(styleOf(iconRoot)["border-radius"] ?? "0");
    expect(iconRadius).toBeGreaterThan(defaultRadius);
  });

  it("含图标元素（Unicode 字形 + 圆形芯片 chrome）", async () => {
    const { elements } = await renderBlock("social-cta", "icon-left");
    const icon = findElementWithText(elements, ICON_LEFT_GLYPH);
    expect(icon).toBeDefined();
    const style = styleOf(icon);
    expect(style["border-radius"]).toBe("50%");
    expect(style.background).toBeTruthy();
    expect(style.background).not.toBe("transparent");
  });

  it("正文文本呈现灰字（textMuted 色随主题解析）", async () => {
    const { elements } = await renderBlock("social-cta", "icon-left");
    const label = elements.find((el) => styleOf(el).color === "#78716c");
    expect(label).toBeDefined();
  });
});

describe("AC-002: social-cta.full-width root 不呈现圆角与边框效果（reset 值）", () => {
  it("default 带圆角与边框，full-width 显式 reset 为 0/none", async () => {
    const { root: defaultRoot } = await renderBlock("social-cta", "default");
    const { root: fullWidthRoot } = await renderBlock("social-cta", "full-width");
    expect(styleOf(defaultRoot)["border-radius"]).toBe("8px");
    expect(styleOf(defaultRoot).border).toContain("solid");
    expect(styleOf(fullWidthRoot)["border-radius"]).toBe("0");
    expect(styleOf(fullWidthRoot).border).toBe("none");
  });
});

describe("AC-003: subscribe-cta.banner 静态引导卡（root 居中加粗、无伪按钮）", () => {
  it("root 携带居中对齐 + 放大字号强调（banner 强调落在 root，字号由正文继承）", async () => {
    const { root } = await renderBlock("subscribe-cta", "banner");
    const style = styleOf(root);
    expect(style["text-align"]).toBe("center");
    expect(Number.parseFloat(style["font-size"] ?? "0")).toBeGreaterThanOrEqual(18);
  });

  it("不含伪按钮元素（微信粘贴后按钮失效，静态引导卡不渲染任何按钮）", async () => {
    const { elements } = await renderBlock("subscribe-cta", "banner");
    expect(findElementWithText(elements, "订阅更新")).toBeUndefined();
    const bodyParagraph = findElementsContainingText(elements, DEFAULT_DIRECTIVE_BODY).find(
      (el) => el.tagName === "p"
    );
    expect(bodyParagraph).toBeDefined();
  });
});

describe("AC-004: advert-card.minimal root 不呈现 border/background 效果，保留 padding", () => {
  it("border 与 background-color 均 reset，padding 与 default 一致", async () => {
    const { root: defaultRoot } = await renderBlock("advert-card", "default");
    const { root: minimalRoot } = await renderBlock("advert-card", "minimal");
    expect(styleOf(defaultRoot).border).toContain("solid");
    expect(styleOf(defaultRoot)["background-color"]).toBe("#fffdf0");
    expect(styleOf(minimalRoot).border).toBe("none");
    expect(styleOf(minimalRoot)["background-color"]).toBe("transparent");
    expect(styleOf(minimalRoot).padding).toBe(styleOf(defaultRoot).padding);
  });
});

describe("AC-005: 6 变体满足未实现谓词豁免与差分守卫", () => {
  it("getUnimplementedVariants() 不含目标 6 变体", () => {
    const unimplemented = new Set(
      getUnimplementedVariants().map((v) => `${v.blockId}::${v.variantId}`)
    );
    for (const { blockId, variantId } of TARGET_VARIANTS) {
      expect(unimplemented.has(`${blockId}::${variantId}`)).toBe(false);
    }
  });

  it("runVariantDiffGuard 不将目标 6 变体判定为渲染同 default 的 finding", async () => {
    const findings = await runVariantDiffGuard({
      buildMarkdown: localBuildMarkdown,
      themeId: "default",
    });
    const findingKeys = new Set(findings.map((f) => `${f.blockId}::${f.variantId}`));
    for (const { blockId, variantId } of TARGET_VARIANTS) {
      expect(findingKeys.has(`${blockId}::${variantId}`)).toBe(false);
    }
  });

  it("runVariantDiffGuard 对目标 6 变体在共享缺省 fixture（非结构化正文）下同样不产生 finding（root 级 delta 兜底）", async () => {
    const findings = await runVariantDiffGuard({
      buildMarkdown: buildDirectiveMarkdown,
      themeId: "default",
    });
    const findingKeys = new Set(findings.map((f) => `${f.blockId}::${f.variantId}`));
    for (const { blockId, variantId } of TARGET_VARIANTS) {
      expect(findingKeys.has(`${blockId}::${variantId}`)).toBe(false);
    }
  });

  it("每项目标变体具备自身 baseStyle delta（诚实实现标记，不依赖 decorate 兜底豁免）", () => {
    for (const { blockId, variantId } of TARGET_VARIANTS) {
      const def = describeBlock(blockId);
      const variant = def?.variants.find((v) => v.id === variantId);
      const hasOwnDelta = Boolean(
        variant?.baseStyle &&
          Object.values(variant.baseStyle).some((slot) => Object.keys(slot).length > 0)
      );
      expect(hasOwnDelta).toBe(true);
    }
  });
});

describe("回归: related-cards/social-cta/subscribe-cta/advert-card 的 default 渲染不受影响", () => {
  it("related-cards.default root style 与既有基线一致", async () => {
    const { html } = await renderMarkdown(buildDirectiveMarkdown("related-cards", "default"), {
      themeId: "default",
    });
    expect(html).toContain(
      'style="background-color: #f9f9f9; border-radius: 8px; border-top: 2px solid #e0e0e0; margin: 24px 0; padding: 16px"'
    );
  });

  it("social-cta.default root style 与既有基线一致", async () => {
    const { html } = await renderMarkdown(buildDirectiveMarkdown("social-cta", "default"), {
      themeId: "default",
    });
    expect(html).toContain(
      'style="background-color: #f0faf0; border: 1px solid #b2ddb2; border-radius: 8px; display: table; margin: 16px 0; padding: 14px 16px; width: 100%"'
    );
  });

  it("subscribe-cta.default root style 与既有基线一致", async () => {
    const { html } = await renderMarkdown(buildDirectiveMarkdown("subscribe-cta", "default"), {
      themeId: "default",
    });
    expect(html).toContain(
      'style="background-color: #f5f0ff; border: 1px solid #d6b4fc; border-radius: 8px; margin: 24px 0; padding: 24px 16px; text-align: center"'
    );
  });

  it("advert-card.default root style 与既有基线一致", async () => {
    const { html } = await renderMarkdown(buildDirectiveMarkdown("advert-card", "default"), {
      themeId: "default",
    });
    expect(html).toContain(
      'style="background-color: #fffdf0; border: 1px solid #e8d5a3; border-radius: 8px; margin: 16px 0; padding: 16px"'
    );
  });
});
