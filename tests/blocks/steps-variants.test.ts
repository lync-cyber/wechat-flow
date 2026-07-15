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

const GAP_VARIANT_IDS = [
  "horizontal",
  "numbered",
  "circle-numbered",
  "timeline",
  "arrow",
  "minimal",
  "filled",
  "compact",
] as const;

const EXPECTED_CARD_HTML =
  '<section><section data-block="steps" data-variant="card" data-steps-item="card" style="background: #f3f0eb; border: 1px solid #d6d3ce; border-radius: 6px; margin: 16px 0; margin-bottom: 12px; padding: 12px 16px"><section style="color: #1c1917; font-size: 15px; font-weight: 600; line-height: 1.85; text-align: left">第一步</section><section style="color: #44403c; font-size: 14px; line-height: 1.85; text-align: left">完成准备工作</section></section><section data-block="steps" data-variant="card" data-steps-item="card" style="background: #f3f0eb; border: 1px solid #d6d3ce; border-radius: 6px; margin: 16px 0; margin-bottom: 12px; padding: 12px 16px"><section style="color: #1c1917; font-size: 15px; font-weight: 600; line-height: 1.85; text-align: left">第二步</section><section style="color: #44403c; font-size: 14px; line-height: 1.85; text-align: left">执行核心操作</section></section><section data-block="steps" data-variant="card" data-steps-item="card" style="background: #f3f0eb; border: 1px solid #d6d3ce; border-radius: 6px; margin: 16px 0; margin-bottom: 0; padding: 12px 16px"><section style="color: #1c1917; font-size: 15px; font-weight: 600; line-height: 1.85; text-align: left">第三步</section><section style="color: #44403c; font-size: 14px; line-height: 1.85; text-align: left">验收交付结果</section></section></section>';

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

async function renderSteps(
  variantId: string,
  themeId = "default"
): Promise<{ html: string; elements: Element[]; root: Element | undefined }> {
  const { html } = await renderMarkdown(buildDirectiveMarkdown("steps", variantId), {
    themeId,
  });
  const tree = fromHtml(html, { fragment: true });
  const elements = collectElements(tree);
  const root = elements.find(
    (el) => el.properties?.dataBlock === "steps" && el.properties?.dataVariant === variantId
  );
  return { html, elements, root };
}

function findElementWithText(elements: Element[], text: string): Element | undefined {
  return elements.find((el) =>
    el.children.some((child) => child.type === "text" && child.value === text)
  );
}

function countElementsWithText(elements: Element[], text: string): number {
  return elements.filter((el) =>
    el.children.some((child) => child.type === "text" && child.value === text)
  ).length;
}

describe("AC-001: horizontal 渲染横向主轴布局（非 flex）+ 顶部实线主轴", () => {
  it("root 携带 border-top 声明，构成顶部实线主轴", async () => {
    const { root } = await renderSteps("horizontal");
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    expect(style["border-top"]).toBeTruthy();
    expect(style["border-top"]?.toLowerCase()).not.toBe("none");
  });

  it("渲染产物中存在 display 计算值等于 table 的元素（横排等效声明，非 flex）", async () => {
    const { elements } = await renderSteps("horizontal");
    const tableDisplay = elements.some(
      (el) => parseStyleDict(el.properties?.style).display === "table"
    );
    expect(tableDisplay).toBe(true);
  });

  it("渲染产物中不存在 display 计算值为 flex 或 inline-flex 的元素", async () => {
    const { elements } = await renderSteps("horizontal");
    const hasFlex = elements.some((el) =>
      ["flex", "inline-flex"].includes(parseStyleDict(el.properties?.style).display ?? "")
    );
    expect(hasFlex).toBe(false);
  });

  it("渲染产物中存在 display 计算值等于 table-cell 的元素（横排单元格）", async () => {
    const { elements } = await renderSteps("horizontal");
    const cellDisplay = elements.some(
      (el) => parseStyleDict(el.properties?.style).display === "table-cell"
    );
    expect(cellDisplay).toBe(true);
  });
});

describe("AC-002: numbered 中文序数前缀 + circle-numbered 圆圈编号容器 + timeline 左侧点线与主色小圆点", () => {
  it("numbered 每步前缀含中文序数字符「一、」「二、」「三、」", async () => {
    const { elements } = await renderSteps("numbered");
    expect(findElementWithText(elements, "一、")).toBeDefined();
    expect(findElementWithText(elements, "二、")).toBeDefined();
    expect(findElementWithText(elements, "三、")).toBeDefined();
  });

  it("numbered 序数装饰节点携带非空 color 声明", async () => {
    const { elements } = await renderSteps("numbered");
    const marker = findElementWithText(elements, "一、");
    const style = parseStyleDict(marker?.properties?.style);
    expect(style.color).toBeTruthy();
  });

  it("numbered 序数装饰颜色跟随主题品牌色（default 与 tech 渲染计算色不同）", async () => {
    const { elements: defaultElements } = await renderSteps("numbered", "default");
    const { elements: techElements } = await renderSteps("numbered", "tech");
    const defaultColor = parseStyleDict(
      findElementWithText(defaultElements, "一、")?.properties?.style
    ).color;
    const techColor = parseStyleDict(
      findElementWithText(techElements, "一、")?.properties?.style
    ).color;
    expect(defaultColor).toBeTruthy();
    expect(techColor).toBeTruthy();
    expect(defaultColor).not.toBe(techColor);
    expect(defaultColor).toBe(defaultTheme.tokens["--color-brand"]);
    expect(techColor).toBe(techTheme.tokens["--color-brand"]);
  });

  it("circle-numbered 每步前缀为 border-radius:50% 的圆圈编号容器", async () => {
    const { elements } = await renderSteps("circle-numbered");
    const circle = elements.find(
      (el) => parseStyleDict(el.properties?.style)["border-radius"] === "50%"
    );
    expect(circle).toBeDefined();
    const style = parseStyleDict(circle?.properties?.style);
    expect(style.background).toBeTruthy();
  });

  it("circle-numbered 圆圈容器依次包含编号文本 1/2/3", async () => {
    const { elements } = await renderSteps("circle-numbered");
    expect(findElementWithText(elements, "1")).toBeDefined();
    expect(findElementWithText(elements, "2")).toBeDefined();
    expect(findElementWithText(elements, "3")).toBeDefined();
  });

  it("timeline root 携带 border-left dotted 声明，构成左侧点线连接装饰", async () => {
    const { root } = await renderSteps("timeline");
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    expect(style["border-left"]).toBeTruthy();
    expect(style["border-left"]?.toLowerCase()).toContain("dotted");
  });

  it("timeline 每步前缀为 border-radius:50% 的主色小圆点", async () => {
    const { elements } = await renderSteps("timeline");
    const dot = elements.find(
      (el) => parseStyleDict(el.properties?.style)["border-radius"] === "50%"
    );
    expect(dot).toBeDefined();
    const style = parseStyleDict(dot?.properties?.style);
    expect(style.background).toBe(defaultTheme.tokens["--color-brand"]);
  });
});

describe("AC-003: arrow 步骤间 → 文本分隔前缀节点", () => {
  it("渲染产物中「→」文本节点数量等于步骤数减一（步骤间分隔，非每步前缀）", async () => {
    const { elements } = await renderSteps("arrow");
    expect(countElementsWithText(elements, "→")).toBe(2);
  });

  it("「→」为独立文本节点（非图形），携带非空 color 声明", async () => {
    const { elements } = await renderSteps("arrow");
    const arrow = findElementWithText(elements, "→");
    expect(arrow).toBeDefined();
    expect(arrow?.tagName).toBe("span");
    const style = parseStyleDict(arrow?.properties?.style);
    expect(style.color).toBeTruthy();
  });
});

describe("AC-004: minimal 不含默认列表符号声明", () => {
  it("渲染产物不含默认列表项符号「•」", async () => {
    const { html } = await renderSteps("minimal");
    expect(html).not.toContain("•");
  });

  it("渲染产物不含 ul/li/table 结构残留（完全绕过默认列表渲染路径）", async () => {
    const { html } = await renderSteps("minimal");
    expect(html).not.toContain("<ul");
    expect(html).not.toContain("<li");
    expect(html).not.toContain("<table");
  });

  it("渲染产物仍保留每步正文内容（标题加粗 + 描述文本）", async () => {
    const { elements } = await renderSteps("minimal");
    expect(findElementWithText(elements, "第一步")).toBeDefined();
  });
});

describe("AC-005: filled/compact 复用 card 化 DOM 结构", () => {
  it("filled root 背景计算值等于 default 主题 --color-brand 实值", async () => {
    const { root } = await renderSteps("filled");
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    expect(style.background).toBe(defaultTheme.tokens["--color-brand"]);
  });

  it("filled 卡片包含 title 与 description 两个子 slot 节点", async () => {
    const { root } = await renderSteps("filled");
    expect(root).toBeDefined();
    const children = (root?.children ?? []).filter(
      (child): child is Element => child.type === "element"
    );
    expect(children.length).toBe(2);
  });

  it("compact root padding 首值小于 card 默认 padding 首值", async () => {
    const { root: cardRoot } = await renderSteps("card");
    const { root: compactRoot } = await renderSteps("compact");
    const cardPaddingTop = Number.parseFloat(
      parseStyleDict(cardRoot?.properties?.style).padding ?? "0"
    );
    const compactPaddingTop = Number.parseFloat(
      parseStyleDict(compactRoot?.properties?.style).padding ?? "0"
    );
    expect(compactPaddingTop).toBeLessThan(cardPaddingTop);
  });

  it("compact margin-bottom 数值小于 card 默认 margin-bottom", async () => {
    const { root: cardRoot } = await renderSteps("card");
    const { root: compactRoot } = await renderSteps("compact");
    const cardMargin = Number.parseFloat(
      parseStyleDict(cardRoot?.properties?.style)["margin-bottom"] ?? "0"
    );
    const compactMargin = Number.parseFloat(
      parseStyleDict(compactRoot?.properties?.style)["margin-bottom"] ?? "0"
    );
    expect(compactMargin).toBeLessThan(cardMargin);
  });

  it("compact 卡片同样包含 title 与 description 两个子 slot 节点", async () => {
    const { root } = await renderSteps("compact");
    expect(root).toBeDefined();
    const children = (root?.children ?? []).filter(
      (child): child is Element => child.type === "element"
    );
    expect(children.length).toBe(2);
  });
});

describe("AC-006: 8 项导入变体满足 T-191 未实现谓词与 T-192 差分守卫；card 渲染字节回归锁", () => {
  it("getUnimplementedVariants() 不含 steps 的 8 项新导入变体", () => {
    const unimplemented = getUnimplementedVariants();
    for (const variantId of GAP_VARIANT_IDS) {
      const flagged = unimplemented.some((c) => c.blockId === "steps" && c.variantId === variantId);
      expect(flagged).toBe(false);
    }
  });

  it("runVariantDiffGuard 不将 steps 的 8 项新导入变体判定为渲染同 default 的 finding", async () => {
    const findings = await runVariantDiffGuard({
      buildMarkdown: buildDirectiveMarkdown,
      themeId: "default",
    });
    for (const variantId of GAP_VARIANT_IDS) {
      const flagged = findings.some((f) => f.blockId === "steps" && f.variantId === variantId);
      expect(flagged).toBe(false);
    }
  });

  it("card 渲染产物字节与既有实现一致（decorate 分支扩展未影响 card 自身行为）", async () => {
    const { html } = await renderMarkdown(buildDirectiveMarkdown("steps", "card"), {
      themeId: "default",
    });
    expect(html).toBe(EXPECTED_CARD_HTML);
  });
});
