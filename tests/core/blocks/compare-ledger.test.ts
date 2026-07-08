import { beforeEach, describe, expect, it } from "vitest";
import {
  describeBlock,
  getBlockBaseStyle,
  renderMarkdown,
  resetBlockRegistry,
  resetVariantRegistry,
} from "../../../packages/core/src/index.ts";
import "../../../packages/blocks/src/index.ts";

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
});

const LEDGER_MD_WITH_TITLE =
  ':::compare{.ledger left-label="优点" left-value="速度快" right-label="缺点" right-value="成本高" title="方案对比"}\n:::';

const LEDGER_MD_NO_TITLE =
  ':::compare{.ledger left-label="优点" left-value="速度快" right-label="缺点" right-value="成本高"}\n:::';

function extractContainerStyle(html: string): string {
  const match = html.match(
    /<section data-block="compare" data-variant="ledger"[^>]* style="([^"]*)"/
  );
  expect(match, `no compare ledger container found in html: ${html}`).not.toBeNull();
  return match?.[1] ?? "";
}

function extractSlotDivStyle(html: string, marker: string): string {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<section style="([^"]*)">[^<]*${escaped}[^<]*</section>`);
  const match = html.match(re);
  expect(match, `no slot section containing "${marker}" found in html: ${html}`).not.toBeNull();
  return match?.[1] ?? "";
}

// AC-001: variants 数组不再含 color-coded，改为 ledger
describe("AC-001: compare variants 数组以 ledger 替代 color-coded", () => {
  it("describeBlock('compare').variants 不含 id 为 color-coded 的变体", () => {
    const def = describeBlock("compare");
    const found = def?.variants.find((v) => v.id === "color-coded");
    expect(found).toBeUndefined();
  });

  it("describeBlock('compare').variants 含 id 为 ledger 的变体", () => {
    const def = describeBlock("compare");
    const found = def?.variants.find((v) => v.id === "ledger");
    expect(found?.id).toBe("ledger");
  });
});

// AC-002: 左列计算 display=table-cell / width=50% / padding=16px
describe("AC-002: ledger 左列计算布局参数", () => {
  it("getBlockBaseStyle 不适用左列（left 为 variant 内 slot），改由渲染后 style 断言：左列 style 含 display: table-cell", async () => {
    const result = await renderMarkdown(LEDGER_MD_WITH_TITLE, { themeId: "default" });
    const style = extractSlotDivStyle(result.html, "速度快");
    expect(style).toContain("display: table-cell");
  });

  it("左列渲染后计算 width = 50%", async () => {
    const result = await renderMarkdown(LEDGER_MD_WITH_TITLE, { themeId: "default" });
    const style = extractSlotDivStyle(result.html, "速度快");
    expect(style).toContain("width: 50%");
  });

  it("左列渲染后计算 padding = 16px", async () => {
    const result = await renderMarkdown(LEDGER_MD_WITH_TITLE, { themeId: "default" });
    const style = extractSlotDivStyle(result.html, "速度快");
    expect(style).toContain("padding: 16px");
  });

  it("左列文本同时含 label 与 value（优点 / 速度快）", async () => {
    const result = await renderMarkdown(LEDGER_MD_WITH_TITLE, { themeId: "default" });
    const style = extractSlotDivStyle(result.html, "速度快");
    expect(style).not.toBe("");
    expect(result.html).toMatch(/优点[\s\S]{0,20}速度快/);
  });
});

// AC-003: 右列样式同左列布局参数 + 两列间 border-left 计算值含 --color-border 实值
describe("AC-003: ledger 右列布局参数与两列分隔线", () => {
  it("右列渲染后计算 display = table-cell", async () => {
    const result = await renderMarkdown(LEDGER_MD_WITH_TITLE, { themeId: "default" });
    const style = extractSlotDivStyle(result.html, "成本高");
    expect(style).toContain("display: table-cell");
  });

  it("右列渲染后计算 width = 50%", async () => {
    const result = await renderMarkdown(LEDGER_MD_WITH_TITLE, { themeId: "default" });
    const style = extractSlotDivStyle(result.html, "成本高");
    expect(style).toContain("width: 50%");
  });

  it("右列渲染后计算 padding = 16px", async () => {
    const result = await renderMarkdown(LEDGER_MD_WITH_TITLE, { themeId: "default" });
    const style = extractSlotDivStyle(result.html, "成本高");
    expect(style).toContain("padding: 16px");
  });

  it("右列渲染后计算 border-left 含 1px solid 与 default 主题 --color-border 实值（#d6d3ce）", async () => {
    const result = await renderMarkdown(LEDGER_MD_WITH_TITLE, { themeId: "default" });
    const style = extractSlotDivStyle(result.html, "成本高");
    expect(style).toContain("border-left: 1px solid #d6d3ce");
  });
});

// AC-004: 标题独立一行，text-align=center / font-weight=600 / margin-bottom=8px，且不在 table-cell 结构内
describe("AC-004: ledger 标题独立一行且不受 table-cell 结构约束", () => {
  it("渲染后标题文本存在于 HTML 中", async () => {
    const result = await renderMarkdown(LEDGER_MD_WITH_TITLE, { themeId: "default" });
    expect(result.html).toContain("方案对比");
  });

  it("标题元素渲染后计算 text-align = center", async () => {
    const result = await renderMarkdown(LEDGER_MD_WITH_TITLE, { themeId: "default" });
    const style = extractSlotDivStyle(result.html, "方案对比");
    expect(style).toContain("text-align: center");
  });

  it("标题元素渲染后计算 font-weight = 600", async () => {
    const result = await renderMarkdown(LEDGER_MD_WITH_TITLE, { themeId: "default" });
    const style = extractSlotDivStyle(result.html, "方案对比");
    expect(style).toContain("font-weight: 600");
  });

  it("标题元素渲染后计算 margin-bottom = 8px", async () => {
    const result = await renderMarkdown(LEDGER_MD_WITH_TITLE, { themeId: "default" });
    const style = extractSlotDivStyle(result.html, "方案对比");
    expect(style).toContain("margin-bottom: 8px");
  });

  it("标题元素不含 display: table-cell（不在两列 table-cell 结构内）", async () => {
    const result = await renderMarkdown(LEDGER_MD_WITH_TITLE, { themeId: "default" });
    const style = extractSlotDivStyle(result.html, "方案对比");
    expect(style).not.toContain("table-cell");
  });

  it("标题元素在 HTML 中出现于左右两列 table-cell 结构之前（跨列独立块，非嵌套其中）", async () => {
    const result = await renderMarkdown(LEDGER_MD_WITH_TITLE, { themeId: "default" });
    const titleIndex = result.html.indexOf("方案对比");
    const leftIndex = result.html.indexOf("速度快");
    expect(titleIndex).toBeGreaterThan(-1);
    expect(leftIndex).toBeGreaterThan(-1);
    expect(titleIndex).toBeLessThan(leftIndex);
  });

  it("无 title 字段时渲染后 HTML 不含标题独立块（title 为可选）", async () => {
    const result = await renderMarkdown(LEDGER_MD_NO_TITLE, { themeId: "default" });
    expect(result.html).not.toContain("方案对比");
    expect(result.html).toContain("速度快");
  });
});

// AC-005: ledger 布局不依赖 display: flex / display: grid
describe("AC-005: ledger 渲染产物不依赖 flex/grid 布局", () => {
  it("渲染后完整 HTML 不含 display: flex", async () => {
    const result = await renderMarkdown(LEDGER_MD_WITH_TITLE, { themeId: "default" });
    expect(result.html).not.toContain("display: flex");
  });

  it("渲染后完整 HTML 不含 display: grid", async () => {
    const result = await renderMarkdown(LEDGER_MD_WITH_TITLE, { themeId: "default" });
    expect(result.html).not.toContain("display: grid");
  });

  it("两列容器计算 display = table（table-based 布局，非 table-cell 本身）", async () => {
    const result = await renderMarkdown(LEDGER_MD_WITH_TITLE, { themeId: "default" });
    expect(result.html).toMatch(/style="[^"]*display: table;[^"]*"/);
  });

  it("getBlockBaseStyle('compare','ledger') 不含 flex 或 grid 相关声明值", () => {
    const base = getBlockBaseStyle("compare", "ledger");
    for (const value of Object.values(base)) {
      expect(value).not.toContain("flex");
      expect(value).not.toContain("grid");
    }
  });
});
