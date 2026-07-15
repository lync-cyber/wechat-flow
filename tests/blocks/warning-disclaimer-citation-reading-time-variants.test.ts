import type { Element, Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { beforeAll, describe, expect, it } from "vitest";
import {
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

const TARGET_VARIANTS: Array<{ blockId: string; variantId: string }> = [
  { blockId: "warning", variantId: "banner" },
  { blockId: "warning", variantId: "inline" },
  { blockId: "disclaimer", variantId: "bordered" },
  { blockId: "disclaimer", variantId: "compact" },
  { blockId: "citation", variantId: "footnote-style" },
  { blockId: "citation", variantId: "inline-link" },
  { blockId: "reading-time", variantId: "inline" },
];

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

function parseTwoValuePaddingPx(value: string | undefined): [number, number] {
  expect(value, "expected a padding declaration").toBeTruthy();
  const match = value?.match(/^([\d.]+)px\s+([\d.]+)px$/);
  expect(match, `padding not in two-value px form: ${value}`).not.toBeNull();
  return [Number.parseFloat(match?.[1] ?? "NaN"), Number.parseFloat(match?.[2] ?? "NaN")];
}

async function renderBlock(
  blockId: string,
  variantId: string,
  themeId = "default"
): Promise<{ elements: Element[]; root: Element | undefined; html: string }> {
  const { html } = await renderMarkdown(buildDirectiveMarkdown(blockId, variantId), { themeId });
  const tree = fromHtml(html, { fragment: true });
  const elements = collectElements(tree);
  const root = elements.find(
    (el) => el.properties?.dataBlock === blockId && el.properties?.dataVariant === variantId
  );
  return { elements, root, html };
}

function firstParagraphFontSizePx(elements: Element[]): number {
  const p = elements.find((el) => el.tagName === "p");
  expect(p, "expected a <p> element in rendered output").toBeDefined();
  const style = parseStyleDict(p?.properties?.style);
  const match = style["font-size"]?.match(/^(-?[\d.]+)px$/);
  expect(match, `expected px font-size on <p>, got: ${style["font-size"]}`).not.toBeNull();
  return Number.parseFloat(match?.[1] ?? "NaN");
}

describe("AC-001: warning.banner 顶部粗边框 + zero-radius + accent 徽章装饰", () => {
  it("root border-top 像素宽度 >= 6 且 border-radius 为 0", async () => {
    const { root } = await renderBlock("warning", "banner");
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    const match = style["border-top"]?.match(/^([\d.]+)px/);
    expect(match, `expected px border-top, got: ${style["border-top"]}`).not.toBeNull();
    expect(Number.parseFloat(match?.[1] ?? "NaN")).toBeGreaterThanOrEqual(6);
    expect(["0", "0px"]).toContain(style["border-radius"]);
  });

  it("渲染产物文本含徽章装饰文字“警告”，携带非空 background-color 声明且不同于 default 卡片底色", async () => {
    const { elements, root } = await renderBlock("warning", "banner");
    const badge = findElementWithText(elements, "警告");
    expect(badge).toBeDefined();
    expect(badge).not.toBe(root);
    const style = parseStyleDict(badge?.properties?.style);
    expect(style["background-color"]).toBeTruthy();
    expect(style["background-color"]).not.toBe("#fff5f5");
  });

  it("default 与 tech 两主题渲染的 badge 背景色不同，证明颜色由 accent token 解析而非硬编码字面值", async () => {
    const { elements: defaultElements } = await renderBlock("warning", "banner", "default");
    const { elements: techElements } = await renderBlock("warning", "banner", "tech");
    const defaultBadge = findElementWithText(defaultElements, "警告");
    const techBadge = findElementWithText(techElements, "警告");
    const defaultColor = parseStyleDict(defaultBadge?.properties?.style)["background-color"];
    const techColor = parseStyleDict(techBadge?.properties?.style)["background-color"];
    expect(defaultColor).toBeTruthy();
    expect(techColor).toBeTruthy();
    expect(defaultColor).not.toBe(techColor);
  });
});

describe("AC-001: warning.inline 去卡片化 + 字号小于 default + 图标前缀装饰", () => {
  it("root 不含 border-radius/background-color 的卡片化效果（值为 0 / transparent 或缺省）", async () => {
    const { root } = await renderBlock("warning", "inline");
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    const radius = style["border-radius"];
    expect(radius === undefined || radius === "0" || radius === "0px").toBe(true);
    const bg = style["background-color"];
    expect(bg === undefined || bg.toLowerCase() === "transparent").toBe(true);
  });

  it("body 段落计算字号小于 default 变体的 body 段落字号", async () => {
    const { elements: defaultElements } = await renderBlock("warning", "default");
    const { elements: inlineElements } = await renderBlock("warning", "inline");
    const defaultFontSize = firstParagraphFontSizePx(defaultElements);
    const inlineFontSize = firstParagraphFontSizePx(inlineElements);
    expect(inlineFontSize).toBeLessThan(defaultFontSize);
  });

  it("渲染产物含图标前缀字符⚠，且携带非空 color 声明", async () => {
    const { elements } = await renderBlock("warning", "inline");
    const icon = findElementWithText(elements, "⚠");
    expect(icon).toBeDefined();
    const style = parseStyleDict(icon?.properties?.style);
    expect(style.color).toBeTruthy();
  });
});

describe("AC-002: disclaimer.bordered 四边全边框 + uppercase 宽字距标题", () => {
  it("root 携带非 none 的 border 声明", async () => {
    const { root } = await renderBlock("disclaimer", "bordered");
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    expect(hasBorderDeclaration(style)).toBe(true);
    expect(style.border).toBeTruthy();
    expect(style.border?.toLowerCase()).not.toBe("none");
  });

  it("root 携带 text-transform:uppercase 与非零 letter-spacing", async () => {
    const { root } = await renderBlock("disclaimer", "bordered");
    const style = parseStyleDict(root?.properties?.style);
    expect(style["text-transform"]).toBe("uppercase");
    expect(style["letter-spacing"]).toBeTruthy();
    expect(style["letter-spacing"]).not.toBe("0");
  });
});

describe("AC-002: disclaimer.compact padding 与 font-size 均小于 bordered", () => {
  it("padding 两个维度均小于 bordered", async () => {
    const { root: borderedRoot } = await renderBlock("disclaimer", "bordered");
    const { root: compactRoot } = await renderBlock("disclaimer", "compact");
    const borderedStyle = parseStyleDict(borderedRoot?.properties?.style);
    const compactStyle = parseStyleDict(compactRoot?.properties?.style);
    const [borderedV, borderedH] = parseTwoValuePaddingPx(borderedStyle.padding);
    const [compactV, compactH] = parseTwoValuePaddingPx(compactStyle.padding);
    expect(compactV).toBeLessThan(borderedV);
    expect(compactH).toBeLessThan(borderedH);
  });

  it("font-size 小于 bordered", async () => {
    const { root: borderedRoot } = await renderBlock("disclaimer", "bordered");
    const { root: compactRoot } = await renderBlock("disclaimer", "compact");
    const borderedStyle = parseStyleDict(borderedRoot?.properties?.style);
    const compactStyle = parseStyleDict(compactRoot?.properties?.style);
    const borderedSize = Number.parseFloat(borderedStyle["font-size"] ?? "NaN");
    const compactSize = Number.parseFloat(compactStyle["font-size"] ?? "NaN");
    expect(compactSize).toBeLessThan(borderedSize);
  });
});

describe("AC-003: citation.footnote-style 悬挂缩进 + 11px 量级字号", () => {
  it("root padding-left 悬挂量与 text-indent 负值等量（hanging indent 不变式），text-indent 为负值", async () => {
    const { root } = await renderBlock("citation", "footnote-style");
    const style = parseStyleDict(root?.properties?.style);
    const paddingTokens = style.padding?.trim().split(/\s+/) ?? [];
    const paddingLeft = paddingTokens[paddingTokens.length - 1];
    const indent = style["text-indent"];
    expect(paddingLeft).toBeTruthy();
    expect(indent).toBeTruthy();
    expect(indent?.startsWith("-")).toBe(true);
    expect(indent?.slice(1)).toBe(paddingLeft);
  });

  it("root font-size 为 11px 量级（<=12px）", async () => {
    const { root } = await renderBlock("citation", "footnote-style");
    const style = parseStyleDict(root?.properties?.style);
    const match = style["font-size"]?.match(/^([\d.]+)px$/);
    expect(match, `expected px font-size, got: ${style["font-size"]}`).not.toBeNull();
    expect(Number.parseFloat(match?.[1] ?? "NaN")).toBeLessThanOrEqual(12);
  });
});

describe("AC-003: citation.inline-link 去左边框 + 下划线链接感", () => {
  it("root 不含 border-left 效果（缺省或值为 none）", async () => {
    const { root } = await renderBlock("citation", "inline-link");
    const style = parseStyleDict(root?.properties?.style);
    const borderLeft = style["border-left"];
    expect(borderLeft === undefined || borderLeft.toLowerCase() === "none").toBe(true);
  });

  it("root 含 text-decoration:underline", async () => {
    const { root } = await renderBlock("citation", "inline-link");
    const style = parseStyleDict(root?.properties?.style);
    expect(style["text-decoration"]).toBe("underline");
  });
});

describe("AC-004: reading-time.inline 去 badge 化，纯文字跟随正文", () => {
  it("root 不含 background-color/border-radius 的 badge 效果（缺省或中性值）", async () => {
    const { root } = await renderBlock("reading-time", "inline");
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    const bg = style["background-color"];
    expect(bg === undefined || bg.toLowerCase() === "transparent").toBe(true);
    const radius = style["border-radius"];
    expect(radius === undefined || radius === "0" || radius === "0px").toBe(true);
  });

  it("root display 不为 inline-block（去除徽章盒模型）", async () => {
    const { root } = await renderBlock("reading-time", "inline");
    const style = parseStyleDict(root?.properties?.style);
    expect(style.display).not.toBe("inline-block");
  });
});

describe("AC-005: 7 项缺口变体满足 T-191 未实现谓词与 T-192 差分守卫", () => {
  it("getUnimplementedVariants() 不含目标 7 变体", () => {
    const unimplemented = new Set(
      getUnimplementedVariants().map((v) => `${v.blockId}::${v.variantId}`)
    );
    for (const { blockId, variantId } of TARGET_VARIANTS) {
      expect(unimplemented.has(`${blockId}::${variantId}`)).toBe(false);
    }
  });

  it("runVariantDiffGuard 不将目标 7 变体判定为渲染同 default 的 finding", async () => {
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

describe("回归: warning/disclaimer/citation/reading-time 的 default 渲染不受影响", () => {
  it("warning.default root style 与既有基线一致", async () => {
    const { html } = await renderMarkdown(buildDirectiveMarkdown("warning", "default"), {
      themeId: "default",
    });
    expect(html).toContain(
      'style="background-color: #fff5f5; border-left: 4px solid #e53e3e; border-radius: 4px; margin: 16px 0; padding: 12px 16px"'
    );
  });

  it("disclaimer.default root style 与既有基线一致", async () => {
    const { html } = await renderMarkdown(buildDirectiveMarkdown("disclaimer", "default"), {
      themeId: "default",
    });
    expect(html).toContain(
      'style="background-color: #f7f7f7; border-radius: 4px; color: #888; font-size: 14px; margin: 16px 0; padding: 12px 16px"'
    );
  });

  it("citation.default root style 与既有基线一致", async () => {
    const { html } = await renderMarkdown(buildDirectiveMarkdown("citation", "default"), {
      themeId: "default",
    });
    expect(html).toContain(
      'style="border-left: 3px solid #ccc; color: #666; font-size: 14.4px; margin: 12px 0; padding: 8px 12px"'
    );
  });

  it("reading-time.default root style 与既有基线一致", async () => {
    const { html } = await renderMarkdown(buildDirectiveMarkdown("reading-time", "default"), {
      themeId: "default",
    });
    expect(html).toContain(
      'style="background-color: #f0f0f0; border-radius: 12px; color: #666; display: inline-block; font-size: 12.8px; margin: 8px 0; padding: 4px 10px"'
    );
  });
});
