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
  { blockId: "kpi-card", variantId: "highlight" },
  { blockId: "kpi-card", variantId: "compact" },
  { blockId: "qa", variantId: "bubble" },
  { blockId: "qa", variantId: "bold-q" },
  { blockId: "tip-grid", variantId: "two-column" },
  { blockId: "tip-grid", variantId: "card-style" },
  { blockId: "definition-list", variantId: "two-column" },
  { blockId: "definition-list", variantId: "card-style" },
];

const KPI_MD = (variant: string): string => `:::kpi-card{.${variant}}\n**42%**\n:::\n`;

const QA_MD = (variant: string): string =>
  `:::qa{.${variant}}\n**问**：这是问题吗？\n\n**答**：这是回答内容。\n:::\n`;

const TIP_GRID_MD = (variant: string): string =>
  [
    `:::tip-grid{.${variant}}`,
    "- **提示一**：说明一",
    "- **提示二**：说明二",
    "- **提示三**：说明三",
    "- **提示四**：说明四",
    ":::",
    "",
  ].join("\n");

const DEFINITION_LIST_MD = (variant: string): string =>
  [
    `:::definition-list{.${variant}}`,
    "- **术语一**：定义一",
    "- **术语二**：定义二",
    "- **术语三**：定义三",
    "- **术语四**：定义四",
    ":::",
    "",
  ].join("\n");

function localBuildMarkdown(blockId: string, variantId: string): string {
  if (blockId === "kpi-card") return KPI_MD(variantId);
  if (blockId === "qa") return QA_MD(variantId);
  if (blockId === "tip-grid") return TIP_GRID_MD(variantId);
  if (blockId === "definition-list") return DEFINITION_LIST_MD(variantId);
  return buildDirectiveMarkdown(blockId, variantId);
}

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
  const { html } = await renderMarkdown(localBuildMarkdown(blockId, variantId), { themeId });
  const tree = fromHtml(html, { fragment: true });
  const elements = collectElements(tree);
  const root = elements.find(
    (el) => el.properties?.dataBlock === blockId && el.properties?.dataVariant === variantId
  );
  return { elements, root, html };
}

describe("AC-001: kpi-card.highlight 顶部 3px 色条 + 数字元素大字号", () => {
  it("root 含顶部 3px 品牌色条", async () => {
    const { root } = await renderBlock("kpi-card", "highlight");
    expect(root).toBeDefined();
    const style = styleOf(root);
    expect(style["border-top"]).toBe("3px solid #2d5a4e");
  });

  it("数字元素（42%）字号大于 default 变体的正文段落字号", async () => {
    const { elements: highlightElements } = await renderBlock("kpi-card", "highlight");
    const { elements: defaultElements } = await renderBlock("kpi-card", "default");
    const valueEl = findElementWithText(highlightElements, "42%");
    const defaultP = defaultElements.find((el) => el.tagName === "p");
    expect(valueEl).toBeDefined();
    expect(defaultP).toBeDefined();
    const valueSize = Number.parseFloat(styleOf(valueEl)["font-size"] ?? "NaN");
    const defaultSize = Number.parseFloat(styleOf(defaultP)["font-size"] ?? "NaN");
    expect(Number.isNaN(valueSize)).toBe(false);
    expect(Number.isNaN(defaultSize)).toBe(false);
    expect(valueSize).toBeGreaterThan(defaultSize);
  });
});

describe("AC-001: kpi-card.compact root padding 小于 default", () => {
  it("padding 两个维度均小于 default(20px/16px)", async () => {
    const { root: defaultRoot } = await renderBlock("kpi-card", "default");
    const { root: compactRoot } = await renderBlock("kpi-card", "compact");
    const [defaultV, defaultH] = parseTwoValuePaddingPx(styleOf(defaultRoot).padding);
    const [compactV, compactH] = parseTwoValuePaddingPx(styleOf(compactRoot).padding);
    expect(compactV).toBeLessThan(defaultV);
    expect(compactH).toBeLessThan(defaultH);
  });
});

describe("AC-002: qa.bubble 问/答分别渲染不同徽章（实心 vs 描边）", () => {
  it("问徽章为实心（非透明背景色）", async () => {
    const { elements } = await renderBlock("qa", "bubble");
    const badge = findElementWithText(elements, "问");
    expect(badge).toBeDefined();
    const style = styleOf(badge);
    expect(style.background).toBeTruthy();
    expect(style.background?.toLowerCase()).not.toBe("transparent");
  });

  it("答徽章为描边（透明背景 + border）", async () => {
    const { elements } = await renderBlock("qa", "bubble");
    const badge = findElementWithText(elements, "答");
    expect(badge).toBeDefined();
    const style = styleOf(badge);
    expect(style.background?.toLowerCase()).toBe("transparent");
    expect(style.border).toBeTruthy();
  });

  it("问答两枚徽章的 chrome 处理不同（一实心一描边）", async () => {
    const { elements } = await renderBlock("qa", "bubble");
    const qBadge = findElementWithText(elements, "问");
    const aBadge = findElementWithText(elements, "答");
    expect(styleOf(qBadge).background).not.toBe(styleOf(aBadge).background);
  });
});

describe("AC-002: qa.bold-q 问句加粗 + 底线分隔", () => {
  it("问句段落含 font-weight 加粗与 border-bottom 分隔线", async () => {
    const { elements } = await renderBlock("qa", "bold-q");
    const question = findElementsContainingText(elements, "这是问题吗？").find(
      (el) => el.tagName === "p"
    );
    expect(question).toBeDefined();
    const style = styleOf(question);
    expect(Number.parseFloat(style["font-weight"] ?? "0")).toBeGreaterThanOrEqual(700);
    expect(style["border-bottom"]).toBeTruthy();
  });

  it("含 Q.01 序号标签", async () => {
    const { elements } = await renderBlock("qa", "bold-q");
    const label = findElementWithText(elements, "Q.01");
    expect(label).toBeDefined();
  });
});

describe("AC-003: tip-grid.two-column 与 definition-list.two-column 呈现 2 列 table-cell 布局", () => {
  it("tip-grid.two-column 含 2 个 table-row 与 4 个 table-cell（width 50%）", async () => {
    const { elements } = await renderBlock("tip-grid", "two-column");
    const rows = elements.filter((el) => styleOf(el).display === "table-row");
    const cells = elements.filter((el) => styleOf(el).display === "table-cell");
    expect(rows.length).toBe(2);
    expect(cells.length).toBe(4);
    for (const cell of cells) {
      expect(styleOf(cell).width).toBe("50%");
    }
  });

  it("definition-list.two-column 含 2 个 table-row 与 4 个 table-cell（width 50%）", async () => {
    const { elements } = await renderBlock("definition-list", "two-column");
    const rows = elements.filter((el) => styleOf(el).display === "table-row");
    const cells = elements.filter((el) => styleOf(el).display === "table-cell");
    expect(rows.length).toBe(2);
    expect(cells.length).toBe(4);
    for (const cell of cells) {
      expect(styleOf(cell).width).toBe("50%");
    }
  });
});

describe("AC-004: tip-grid.card-style 与 definition-list.card-style 按项循环应用单元格级 chrome", () => {
  it("tip-grid.card-style 4 个独立项各含 1px border，root 本身不携带该 border", async () => {
    const { elements, root } = await renderBlock("tip-grid", "card-style");
    const bordered = elements.filter((el) => {
      const border = styleOf(el).border;
      return typeof border === "string" && border.includes("1px solid");
    });
    expect(bordered.length).toBe(4);
    expect(styleOf(root).border).toBeUndefined();
  });

  it("tip-grid.card-style 每项标题携带 textMuted 弱化色", async () => {
    const { elements } = await renderBlock("tip-grid", "card-style");
    const title = findElementWithText(elements, "提示一");
    expect(title).toBeDefined();
    expect(styleOf(title).color).toBe("#78716c");
  });

  it("definition-list.card-style 4 个独立项各含 1px border，root 本身不携带该 border", async () => {
    const { elements, root } = await renderBlock("definition-list", "card-style");
    const bordered = elements.filter((el) => {
      const border = styleOf(el).border;
      return typeof border === "string" && border.includes("1px solid");
    });
    expect(bordered.length).toBe(4);
    expect(styleOf(root).border).toBeUndefined();
  });

  it("definition-list.card-style 每个术语携带 textMuted 弱化色", async () => {
    const { elements } = await renderBlock("definition-list", "card-style");
    const term = findElementWithText(elements, "术语一");
    expect(term).toBeDefined();
    expect(styleOf(term).color).toBe("#78716c");
  });
});

describe("AC-005: 8 变体满足 T-191 未实现谓词与 T-192 差分守卫", () => {
  it("getUnimplementedVariants() 不含目标 8 变体", () => {
    const unimplemented = new Set(
      getUnimplementedVariants().map((v) => `${v.blockId}::${v.variantId}`)
    );
    for (const { blockId, variantId } of TARGET_VARIANTS) {
      expect(unimplemented.has(`${blockId}::${variantId}`)).toBe(false);
    }
  });

  it("runVariantDiffGuard 不将目标 8 变体判定为渲染同 default 的 finding", async () => {
    const findings = await runVariantDiffGuard({
      buildMarkdown: localBuildMarkdown,
      themeId: "default",
    });
    const findingKeys = new Set(findings.map((f) => `${f.blockId}::${f.variantId}`));
    for (const { blockId, variantId } of TARGET_VARIANTS) {
      expect(findingKeys.has(`${blockId}::${variantId}`)).toBe(false);
    }
  });

  it("runVariantDiffGuard 对目标 8 变体在共享缺省 fixture（非结构化正文）下同样不产生 finding（root 级 delta 兜底）", async () => {
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

describe("回归: kpi-card/qa/tip-grid/definition-list 的 default 渲染不受影响", () => {
  it("kpi-card.default root style 与既有基线一致", async () => {
    const { html } = await renderMarkdown(buildDirectiveMarkdown("kpi-card", "default"), {
      themeId: "default",
    });
    expect(html).toContain(
      'style="background-color: #ffffff; border: 1px solid #e8e8e8; border-radius: 8px; margin: 12px 0; padding: 20px 16px; text-align: center"'
    );
  });

  it("qa.default root style 与既有基线一致", async () => {
    const { html } = await renderMarkdown(buildDirectiveMarkdown("qa", "default"), {
      themeId: "default",
    });
    expect(html).toContain('style="margin: 16px 0; padding: 0"');
  });

  it("tip-grid.default root style 与既有基线一致", async () => {
    const { html } = await renderMarkdown(buildDirectiveMarkdown("tip-grid", "default"), {
      themeId: "default",
    });
    expect(html).toContain(
      'style="border-collapse: separate; border-spacing: 8px; display: table; margin: 16px 0; width: 100%"'
    );
  });

  it("definition-list.default root style 与既有基线一致", async () => {
    const { html } = await renderMarkdown(buildDirectiveMarkdown("definition-list", "default"), {
      themeId: "default",
    });
    expect(html).toContain('style="border-top: 1px solid #e8e8e8; margin: 16px 0; padding: 0"');
  });
});

describe("主题差分: qa.bubble 徽章色随主题 token 变化（非硬编码字面色）", () => {
  it("default 与 tech 两主题渲染的问徽章背景色不同", async () => {
    const { elements: defaultElements } = await renderBlock("qa", "bubble", "default");
    const { elements: techElements } = await renderBlock("qa", "bubble", "tech");
    const defaultBadge = findElementWithText(defaultElements, "问");
    const techBadge = findElementWithText(techElements, "问");
    const defaultColor = styleOf(defaultBadge).background;
    const techColor = styleOf(techBadge).background;
    expect(defaultColor).toBeTruthy();
    expect(techColor).toBeTruthy();
    expect(defaultColor).not.toBe(techColor);
  });
});
