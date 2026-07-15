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

const TABLE_MD = (variant: string): string =>
  `:::table{.${variant}}\n| 月份 | 销量 |\n| --- | --- |\n| 1月 | 1240 |\n| 2月 | 980 |\n| 3月 | 1520 |\n:::\n`;

const COMPARE_MD = (variant: string): string =>
  `:::compare{.${variant} left-label="优点" left-value="速度快" right-label="缺点" right-value="成本高" title="方案对比"}\n:::\n`;

function extractRootStyle(html: string, blockId: string, variantId: string): string {
  const re = new RegExp(
    `<section data-block="${blockId}" data-variant="${variantId}"[^>]* style="([^"]*)"`
  );
  const match = html.match(re);
  return match?.[1] ?? "";
}

function collectByTag(html: string, tagNames: string[]): Element[] {
  const tree = fromHtml(html, { fragment: true });
  const wanted = new Set(tagNames);
  const found: Element[] = [];
  function walk(node: Root | Element): void {
    for (const child of node.children) {
      if (child.type === "element") {
        const el = child as Element;
        if (wanted.has(el.tagName)) found.push(el);
        walk(el);
      }
    }
  }
  walk(tree);
  return found;
}

function styleOf(el: Element | undefined): string {
  const s = el?.properties?.style;
  return typeof s === "string" ? s : "";
}

function extractSlotStyle(html: string, marker: string): string {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<section style="([^"]*)">[^<]*${escaped}[^<]*</section>`);
  const match = html.match(re);
  expect(match, `no slot section containing "${marker}" found in html: ${html}`).not.toBeNull();
  return match?.[1] ?? "";
}

function firstPxNumber(style: string, prop: string): number {
  const re = new RegExp(`${prop}:\\s*([\\d.]+)px`);
  const match = style.match(re);
  expect(match, `property "${prop}" not found as px value in style: ${style}`).not.toBeNull();
  return Number.parseFloat(match?.[1] ?? "NaN");
}

function paddingNumbers(style: string): [number, number] {
  const match = style.match(/padding:\s*([\d.]+)px\s+([\d.]+)px/);
  expect(match, `padding not found as two px values in style: ${style}`).not.toBeNull();
  return [Number.parseFloat(match?.[1] ?? "NaN"), Number.parseFloat(match?.[2] ?? "NaN")];
}

describe("AC-001: table.striped 奇偶行 cell 背景交替 + 顶底 hairline", () => {
  it("奇数行(1月/3月)的 td 含 surface-alt 背景色", async () => {
    const result = await renderMarkdown(TABLE_MD("striped"), { themeId: "default" });
    const tds = collectByTag(result.html, ["td"]);
    expect(styleOf(tds[0])).toContain("background-color: #f3f0eb");
    expect(styleOf(tds[1])).toContain("background-color: #f3f0eb");
    expect(styleOf(tds[4])).toContain("background-color: #f3f0eb");
    expect(styleOf(tds[5])).toContain("background-color: #f3f0eb");
  });

  it("偶数行(2月)的 td 不含背景色声明（与奇数行交替）", async () => {
    const result = await renderMarkdown(TABLE_MD("striped"), { themeId: "default" });
    const tds = collectByTag(result.html, ["td"]);
    expect(styleOf(tds[2])).not.toContain("background-color");
    expect(styleOf(tds[3])).not.toContain("background-color");
  });

  it("root 含顶/底 1px hairline", async () => {
    const result = await renderMarkdown(TABLE_MD("striped"), { themeId: "default" });
    const style = extractRootStyle(result.html, "table", "striped");
    expect(style).toContain("border-top: 1px solid #a8a29e");
    expect(style).toContain("border-bottom: 1px solid #a8a29e");
  });
});

describe("AC-001: table.bordered 全 cell 1px 边框 + 外框圆角", () => {
  it("全部 td/th 均含 1px border 声明", async () => {
    const result = await renderMarkdown(TABLE_MD("bordered"), { themeId: "default" });
    const cells = collectByTag(result.html, ["td", "th"]);
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(styleOf(cell)).toContain("border: 1px solid #d6d3ce");
    }
  });

  it("root 含外框 border + border-radius + overflow hidden", async () => {
    const result = await renderMarkdown(TABLE_MD("bordered"), { themeId: "default" });
    const style = extractRootStyle(result.html, "table", "bordered");
    expect(style).toContain("border: 1px solid #d6d3ce");
    expect(style).toContain("border-radius: 4px");
    expect(style).toContain("overflow: hidden");
  });
});

describe("AC-001: table.highlight-header header 边框强调区别于 body", () => {
  it("th 呈线型强调（border:none + border-bottom:2px solid），与 td 的四边细边框不同", async () => {
    const result = await renderMarkdown(TABLE_MD("highlight-header"), { themeId: "default" });
    const ths = collectByTag(result.html, ["th"]);
    const tds = collectByTag(result.html, ["td"]);
    for (const th of ths) {
      const style = styleOf(th);
      expect(style).toContain("border: none");
      expect(style).toContain("border-bottom: 2px solid #a8a29e");
    }
    for (const td of tds) {
      expect(styleOf(td)).not.toContain("border: none");
    }
  });

  it("root 含顶/底 2px 分隔线", async () => {
    const result = await renderMarkdown(TABLE_MD("highlight-header"), { themeId: "default" });
    const style = extractRootStyle(result.html, "table", "highlight-header");
    expect(style).toContain("border-top: 2px solid #a8a29e");
    expect(style).toContain("border-bottom: 2px solid #a8a29e");
  });
});

describe("AC-001: table.compact 的 cell padding 与 font-size 数值均小于 default", () => {
  it("padding 两个维度均小于 default 基线(8px/12px)", async () => {
    const defaultResult = await renderMarkdown(TABLE_MD("default"), { themeId: "default" });
    const compactResult = await renderMarkdown(TABLE_MD("compact"), { themeId: "default" });
    const defaultTd = collectByTag(defaultResult.html, ["td"])[0];
    const compactTd = collectByTag(compactResult.html, ["td"])[0];
    const [defaultV, defaultH] = paddingNumbers(styleOf(defaultTd));
    const [compactV, compactH] = paddingNumbers(styleOf(compactTd));
    expect(compactV).toBeLessThan(defaultV);
    expect(compactH).toBeLessThan(defaultH);
  });

  it("font-size 显式声明且小于标准正文基准值(15px)", async () => {
    const result = await renderMarkdown(TABLE_MD("compact"), { themeId: "default" });
    const compactTd = collectByTag(result.html, ["td"])[0];
    expect(firstPxNumber(styleOf(compactTd), "font-size")).toBeLessThan(15);
  });

  it("表头 th 仍保留强调背景与加粗（密度收紧不牺牲表头可辨识度）", async () => {
    const result = await renderMarkdown(TABLE_MD("compact"), { themeId: "default" });
    const th = collectByTag(result.html, ["th"])[0];
    const style = styleOf(th);
    expect(style).toContain("background-color: #f3f0eb");
    expect(style).toContain("font-weight: 600");
  });
});

describe("AC-002: compare.highlight-right left/right slot 非对称视觉处理", () => {
  it("left(优点：速度快) 呈描边处理", async () => {
    const result = await renderMarkdown(COMPARE_MD("highlight-right"), { themeId: "default" });
    const style = extractSlotStyle(result.html, "速度快");
    expect(style).toContain("border: 2px solid #2d5a4e");
    expect(style).not.toContain("background: #2d5a4e");
  });

  it("right(缺点：成本高) 呈实心填充 + inverse 文本色（与 left 描边不同）", async () => {
    const result = await renderMarkdown(COMPARE_MD("highlight-right"), { themeId: "default" });
    const style = extractSlotStyle(result.html, "成本高");
    expect(style).toContain("background: #2d5a4e");
    expect(style).toContain("color: #fafaf9");
    expect(style).not.toContain("border: 2px solid");
  });
});

describe("AC-002: compare.table-style 纵向双行（非 ledger 的左右并排）", () => {
  it("left/right 两侧均为 display:block 全宽，非 table-cell", async () => {
    const result = await renderMarkdown(COMPARE_MD("table-style"), { themeId: "default" });
    const leftStyle = extractSlotStyle(result.html, "速度快");
    const rightStyle = extractSlotStyle(result.html, "成本高");
    for (const style of [leftStyle, rightStyle]) {
      expect(style).toContain("display: block");
      expect(style).not.toContain("table-cell");
      expect(style).toContain("width: 100%");
      expect(style).toContain("border-bottom: 1px solid #d6d3ce");
    }
  });
});

describe("AC-002: compare.compact 上下堆叠全宽", () => {
  it("left/right 两侧均为 display:block 全宽堆叠，非 table-cell", async () => {
    const result = await renderMarkdown(COMPARE_MD("compact"), { themeId: "default" });
    const leftStyle = extractSlotStyle(result.html, "速度快");
    const rightStyle = extractSlotStyle(result.html, "成本高");
    for (const style of [leftStyle, rightStyle]) {
      expect(style).toContain("display: block");
      expect(style).not.toContain("table-cell");
      expect(style).toContain("width: 100%");
    }
  });

  it("left/right 各自使用不同强调色区分两侧", async () => {
    const result = await renderMarkdown(COMPARE_MD("compact"), { themeId: "default" });
    const leftStyle = extractSlotStyle(result.html, "速度快");
    const rightStyle = extractSlotStyle(result.html, "成本高");
    expect(leftStyle).toContain("border-left: 3px solid #2d5a4e");
    expect(rightStyle).toContain("border-left: 3px solid #b94a3e");
  });
});

describe("AC-003: 7 变体满足 T-191 谓词 + T-192 差分守卫不 finding", () => {
  const TARGET_KEYS = [
    "table::striped",
    "table::bordered",
    "table::compact",
    "table::highlight-header",
    "compare::highlight-right",
    "compare::table-style",
    "compare::compact",
  ];

  it("getUnimplementedVariants() 不含目标 7 变体", () => {
    const unimplementedKeys = new Set(
      getUnimplementedVariants().map((v) => `${v.blockId}::${v.variantId}`)
    );
    for (const key of TARGET_KEYS) {
      expect(unimplementedKeys.has(key)).toBe(false);
    }
  });

  it("runVariantDiffGuard 对目标 7 变体不产生 finding（table 使用真实表格 markdown body 注入）", async () => {
    function buildMarkdown(blockId: string, variantId: string): string {
      if (blockId === "table") return TABLE_MD(variantId);
      return buildDirectiveMarkdown(blockId, variantId);
    }

    const findings = await runVariantDiffGuard({ buildMarkdown, themeId: "default" });
    const findingKeys = new Set(findings.map((f) => `${f.blockId}::${f.variantId}`));
    for (const key of TARGET_KEYS) {
      expect(findingKeys.has(key)).toBe(false);
    }
  });
});

describe("回归: table/compare default 渲染不受影响", () => {
  it("table 裸指令渲染保持既有基线（无 root style，cell 边框/padding 不变）", async () => {
    const result = await renderMarkdown(TABLE_MD("default"), { themeId: "default" });
    expect(extractRootStyle(result.html, "table", "default")).toContain(
      "border-collapse: collapse"
    );
    const td = collectByTag(result.html, ["td"])[0];
    expect(styleOf(td)).toBe("border: 1px solid #d6d3ce; color: #1c1917; padding: 8px 12px");
  });

  it("compare.ledger 渲染不受 decorate 条件扩展影响", async () => {
    const md =
      ':::compare{.ledger left-label="优点" left-value="速度快" right-label="缺点" right-value="成本高" title="方案对比"}\n:::';
    const result = await renderMarkdown(md, { themeId: "default" });
    const style = extractSlotStyle(result.html, "速度快");
    expect(style).toContain("display: table-cell");
    expect(style).toContain("background: #f3f0eb");
  });
});
