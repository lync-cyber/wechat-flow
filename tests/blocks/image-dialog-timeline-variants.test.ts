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
import { buildDirectiveMarkdown } from "./directive-markdown-fixtures.ts";

interface LocalDirective {
  attrs?: string;
  body: string;
}

const LOCAL_DIRECTIVE_BY_BLOCK: Record<string, LocalDirective> = {
  image: { body: "![封面图](https://example.com/cover.png)" },
  "image-caption": {
    body: "![封面图](https://example.com/cover.png)\n\n这是图片说明文字。",
  },
  dialog: {
    attrs: ' speaker="alice"',
    body: "这是一段用于验证访谈栏渲染效果的完整长答案示例文本。",
  },
  timeline: {
    body: ["- **2024 年**：项目启动", "- **2025 年**：产品发布", "- **2026 年**：规模化增长"].join(
      "\n"
    ),
  },
};

function buildLocalMarkdown(blockId: string, variantId: string): string {
  const local = LOCAL_DIRECTIVE_BY_BLOCK[blockId];
  if (!local) return buildDirectiveMarkdown(blockId, variantId);
  const header = `:::${blockId}{.${variantId}${local.attrs ?? ""}}`;
  return `${header}\n${local.body}\n:::`;
}

const GAP_VARIANTS = [
  { blockId: "image", variantId: "rounded" },
  { blockId: "image", variantId: "full-width" },
  { blockId: "image-caption", variantId: "side" },
  { blockId: "dialog", variantId: "interview" },
  { blockId: "timeline", variantId: "horizontal" },
  { blockId: "timeline", variantId: "compact" },
] as const;

beforeAll(() => {
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

function lastNumeric(value: string | undefined): number {
  if (!value) return 0;
  const tokens = value.trim().split(/\s+/);
  const match = tokens[tokens.length - 1]?.match(/-?\d+(\.\d+)?/);
  return match ? Number.parseFloat(match[0]) : 0;
}

function firstNumeric(value: string | undefined): number {
  if (!value) return 0;
  const tokens = value.trim().split(/\s+/);
  const match = tokens[0]?.match(/-?\d+(\.\d+)?/);
  return match ? Number.parseFloat(match[0]) : 0;
}

function textContentOf(el: Element): string {
  return el.children
    .map((child) => {
      if (child.type === "text") return child.value;
      if (child.type === "element") return textContentOf(child);
      return "";
    })
    .join("");
}

async function renderBlock(
  blockId: string,
  variantId: string,
  themeId = "default"
): Promise<{ html: string; elements: Element[]; root: Element | undefined }> {
  const { html } = await renderMarkdown(buildLocalMarkdown(blockId, variantId), { themeId });
  const tree = fromHtml(html, { fragment: true });
  const elements = collectElements(tree);
  const root = elements.find(
    (el) => el.properties?.dataBlock === blockId && el.properties?.dataVariant === variantId
  );
  return { html, elements, root };
}

function directChildElementsOf(el: Element | undefined): Element[] {
  if (!el) return [];
  return el.children.filter((child): child is Element => child.type === "element");
}

function findTableCellContainingImg(elements: Element[]): Element | undefined {
  return elements.find(
    (el) =>
      parseStyleDict(el.properties?.style).display === "table-cell" &&
      el.children.some((child) => child.type === "element" && child.tagName === "img")
  );
}

function findTableCellWithText(elements: Element[], text: string): Element | undefined {
  return elements.find(
    (el) =>
      parseStyleDict(el.properties?.style).display === "table-cell" && textContentOf(el) === text
  );
}

describe("AC-001: image.rounded root 含 border-radius；image.full-width root width:100%", () => {
  it("image.rounded root 携带非 none 的 border-radius 声明", async () => {
    const { root } = await renderBlock("image", "rounded");
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    expect(style["border-radius"]).toBeTruthy();
    expect(style["border-radius"]?.toLowerCase()).not.toBe("none");
  });

  it("image.full-width root width 计算值等于 100%", async () => {
    const { root } = await renderBlock("image", "full-width");
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    expect(style.width).toBe("100%");
  });
});

describe("AC-002: image-caption.side 图片 cell + 文字 cell 并排 table-cell 双列（禁 position:absolute）", () => {
  it("渲染产物含内嵌 img 的 table-cell 元素（图片 cell）", async () => {
    const { elements } = await renderBlock("image-caption", "side");
    const imageCell = findTableCellContainingImg(elements);
    expect(imageCell).toBeDefined();
  });

  it("渲染产物含文本为图片说明的 table-cell 元素（文字说明 cell）", async () => {
    const { elements } = await renderBlock("image-caption", "side");
    const captionCell = findTableCellWithText(elements, "这是图片说明文字。");
    expect(captionCell).toBeDefined();
  });

  it("root 直接子节点恰为 2 个 table-cell（图片 cell + 文字 cell 并排，非叠加）", async () => {
    const { root } = await renderBlock("image-caption", "side");
    const cells = directChildElementsOf(root);
    expect(cells.length).toBe(2);
    for (const cell of cells) {
      expect(parseStyleDict(cell.properties?.style).display).toBe("table-cell");
    }
  });

  it("image-cell 内嵌真实 img 元素，src 指向原始图片地址", async () => {
    const { elements } = await renderBlock("image-caption", "side");
    const img = elements.find((el) => el.tagName === "img");
    expect(img).toBeDefined();
    expect(img?.properties?.src).toBe("https://example.com/cover.png");
  });

  it("root display 计算值为 table（并排布局，非叠加）", async () => {
    const { root } = await renderBlock("image-caption", "side");
    expect(parseStyleDict(root?.properties?.style).display).toBe("table");
  });

  it("渲染产物不含 position:absolute 声明", async () => {
    const { html } = await renderBlock("image-caption", "side");
    expect(html.toLowerCase()).not.toContain("position");
  });
});

describe("AC-003: dialog.interview 左列大写姓名 + 右列长答双栏 + hairline 沟槽", () => {
  it("渲染产物含文本为大写说话人名的 table-cell 元素（左列姓名）", async () => {
    const { elements } = await renderBlock("dialog", "interview");
    const nameCell = findTableCellWithText(elements, "ALICE");
    expect(nameCell).toBeDefined();
  });

  it("姓名 cell 携带 text-transform:uppercase 与 font-weight:700 声明", async () => {
    const { elements } = await renderBlock("dialog", "interview");
    const nameCell = findTableCellWithText(elements, "ALICE");
    const style = parseStyleDict(nameCell?.properties?.style);
    expect(style["text-transform"]).toBe("uppercase");
    expect(style["font-weight"]).toBe("700");
  });

  it("root 第二个直接子节点（右列长答）携带 border-left 声明构成 hairline 沟槽", async () => {
    const { root } = await renderBlock("dialog", "interview");
    const cells = directChildElementsOf(root);
    const answerCell = cells[1];
    expect(answerCell).toBeDefined();
    const style = parseStyleDict(answerCell?.properties?.style);
    expect(style["border-left"]).toBeTruthy();
    expect(style["border-left"]?.toLowerCase()).not.toBe("none");
  });

  it("右列长答 cell 保留原始长答文本内容", async () => {
    const { root } = await renderBlock("dialog", "interview");
    const cells = directChildElementsOf(root);
    expect(textContentOf(cells[1] as Element)).toContain(
      "这是一段用于验证访谈栏渲染效果的完整长答案示例文本。"
    );
  });

  it("root 直接子节点恰为 2 个 table-cell（左列姓名 + 右列长答双栏）", async () => {
    const { root } = await renderBlock("dialog", "interview");
    const cells = directChildElementsOf(root);
    expect(cells.length).toBe(2);
    for (const cell of cells) {
      expect(parseStyleDict(cell.properties?.style).display).toBe("table-cell");
    }
  });
});

describe("AC-004: timeline.horizontal 横向主轴 + timeline.compact 间距/padding 收紧", () => {
  it("horizontal root 携带 border-top 声明，构成实线主轴", async () => {
    const { root } = await renderBlock("timeline", "horizontal");
    expect(root).toBeDefined();
    const style = parseStyleDict(root?.properties?.style);
    expect(style["border-top"]).toBeTruthy();
    expect(style["border-top"]?.toLowerCase()).not.toBe("none");
  });

  it("horizontal 渲染产物中存在 display 计算值为 table 的元素（横排容器）", async () => {
    const { elements } = await renderBlock("timeline", "horizontal");
    const hasTable = elements.some(
      (el) => parseStyleDict(el.properties?.style).display === "table"
    );
    expect(hasTable).toBe(true);
  });

  it("horizontal 渲染产物中存在 display 计算值为 table-cell 的元素（横排单元格）", async () => {
    const { elements } = await renderBlock("timeline", "horizontal");
    const cellCount = elements.filter(
      (el) => parseStyleDict(el.properties?.style).display === "table-cell"
    ).length;
    expect(cellCount).toBe(3);
  });

  it("horizontal 渲染产物中不存在 flex/inline-flex 元素", async () => {
    const { elements } = await renderBlock("timeline", "horizontal");
    const hasFlex = elements.some((el) =>
      ["flex", "inline-flex"].includes(parseStyleDict(el.properties?.style).display ?? "")
    );
    expect(hasFlex).toBe(false);
  });

  it("horizontal 渲染产物保留原始时间节点文本内容", async () => {
    const { html } = await renderBlock("timeline", "horizontal");
    expect(html).toContain("项目启动");
    expect(html).toContain("产品发布");
    expect(html).toContain("规模化增长");
  });

  it("compact root padding 末值（左侧缩进）小于 default 纵向时间线", async () => {
    const { root: defaultRoot } = await renderBlock("timeline", "default");
    const { root: compactRoot } = await renderBlock("timeline", "compact");
    const defaultPadding = lastNumeric(parseStyleDict(defaultRoot?.properties?.style).padding);
    const compactPadding = lastNumeric(parseStyleDict(compactRoot?.properties?.style).padding);
    expect(compactPadding).toBeLessThan(defaultPadding);
  });

  it("compact root margin 首值小于 default 纵向时间线", async () => {
    const { root: defaultRoot } = await renderBlock("timeline", "default");
    const { root: compactRoot } = await renderBlock("timeline", "compact");
    const defaultMargin = firstNumeric(parseStyleDict(defaultRoot?.properties?.style).margin);
    const compactMargin = firstNumeric(parseStyleDict(compactRoot?.properties?.style).margin);
    expect(compactMargin).toBeLessThan(defaultMargin);
  });

  it("default 纵向时间线 root 携带 border-left 声明（竖向主轴）", async () => {
    const { root } = await renderBlock("timeline", "default");
    const style = parseStyleDict(root?.properties?.style);
    expect(style["border-left"]).toBeTruthy();
    expect(style["border-left"]?.toLowerCase()).not.toBe("none");
  });
});

describe("AC-005: 6 项新变体满足 T-191 未实现谓词与 T-192 差分守卫", () => {
  it("getUnimplementedVariants() 不含 6 项新变体", () => {
    const unimplemented = getUnimplementedVariants();
    for (const { blockId, variantId } of GAP_VARIANTS) {
      const flagged = unimplemented.some((c) => c.blockId === blockId && c.variantId === variantId);
      expect(flagged).toBe(false);
    }
  });

  it("runVariantDiffGuard 不将 6 项新变体判定为渲染同 default 的 finding", async () => {
    const findings = await runVariantDiffGuard({
      buildMarkdown: buildLocalMarkdown,
      themeId: "default",
    });
    for (const { blockId, variantId } of GAP_VARIANTS) {
      const flagged = findings.some((f) => f.blockId === blockId && f.variantId === variantId);
      expect(flagged).toBe(false);
    }
  });
});
