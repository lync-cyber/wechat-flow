import { beforeEach, describe, expect, it } from "vitest";
import {
  registerTheme,
  renderMarkdown,
  resetBlockRegistry,
  resetThemeRegistry,
  resetVariantRegistry,
} from "../../../packages/core/src/index.ts";
import "../../../packages/blocks/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
  resetThemeRegistry();
  registerTheme(defaultTheme);
});

function galleryMarkdown(
  variant: string,
  images: Array<{ src: string; alt: string; caption?: string }>
): string {
  const items = images.map((img) => {
    const titlePart = img.caption ? ` "${img.caption}"` : "";
    return `- ![${img.alt}](${img.src}${titlePart})`;
  });
  return [`:::gallery{.${variant}}`, ...items, ":::"].join("\n");
}

function extractRowChunks(html: string): string[] {
  const openTagRe = /<section data-block="gallery" data-variant="[^"]*"[^>]*>/g;
  const rootMatch = openTagRe.exec(html);
  expect(rootMatch, `no gallery root found in html: ${html}`).not.toBeNull();
  const rowOpenRe = /<section style="([^"]*display: table-row[^"]*)">/g;
  return [...html.matchAll(rowOpenRe)].map((m) => m[0]);
}

function extractRowStyles(html: string): string[] {
  const rowOpenRe = /<section style="([^"]*display: table-row[^"]*)">/g;
  return [...html.matchAll(rowOpenRe)].map((m) => m[1]);
}

function extractCellStyles(html: string): string[] {
  const cellOpenRe = /<section style="([^"]*display: table-cell[^"]*)">/g;
  return [...html.matchAll(cellOpenRe)].map((m) => m[1]);
}

function extractCaptionStyles(html: string): string[] {
  const captionRe = /<section style="([^"]*text-align: center[^"]*)">/g;
  return [...html.matchAll(captionRe)].map((m) => m[1]);
}

const TWO_IMAGE_DUO_MD = galleryMarkdown("duo", [
  { src: "https://example.com/a.png", alt: "图一" },
  { src: "https://example.com/b.png", alt: "图二" },
]);

const THREE_IMAGE_TRIPTYCH_MD = galleryMarkdown("triptych", [
  { src: "https://example.com/a.png", alt: "图一" },
  { src: "https://example.com/b.png", alt: "图二" },
  { src: "https://example.com/c.png", alt: "图三" },
]);

const FIVE_IMAGE_TRIPTYCH_MD = galleryMarkdown("triptych", [
  { src: "https://example.com/a.png", alt: "图一" },
  { src: "https://example.com/b.png", alt: "图二" },
  { src: "https://example.com/c.png", alt: "图三" },
  { src: "https://example.com/d.png", alt: "图四" },
  { src: "https://example.com/e.png", alt: "图五" },
]);

const CAPTIONED_DUO_MD = galleryMarkdown("duo", [
  { src: "https://example.com/a.png", alt: "图一", caption: "第一张说明" },
  { src: "https://example.com/b.png", alt: "图二" },
]);

const THREE_IMAGE_DEFAULT_MD = galleryMarkdown("default", [
  { src: "https://example.com/a.png", alt: "图一", caption: "第一张说明" },
  { src: "https://example.com/b.png", alt: "图二" },
  { src: "https://example.com/c.png", alt: "图三" },
]);

// AC-001: duo 变体 — 每两张一组 table-row，各图 table-cell / width 50% / padding 4px
describe("AC-001: duo 变体每两张一组渲染 table-row/table-cell 计算值", () => {
  it("2 张图片渲染出 1 个 table-row", async () => {
    const result = await renderMarkdown(TWO_IMAGE_DUO_MD, { themeId: "default" });
    const rows = extractRowStyles(result.html);
    expect(rows.length).toBe(1);
  });

  it("table-row 计算 display = table-row", async () => {
    const result = await renderMarkdown(TWO_IMAGE_DUO_MD, { themeId: "default" });
    const rows = extractRowStyles(result.html);
    expect(rows[0]).toContain("display: table-row");
  });

  it("每个图片单元计算 display = table-cell", async () => {
    const result = await renderMarkdown(TWO_IMAGE_DUO_MD, { themeId: "default" });
    const cells = extractCellStyles(result.html);
    expect(cells.length).toBe(2);
    for (const cell of cells) {
      expect(cell).toContain("display: table-cell");
    }
  });

  it("每个图片单元计算 width = 50%", async () => {
    const result = await renderMarkdown(TWO_IMAGE_DUO_MD, { themeId: "default" });
    const cells = extractCellStyles(result.html);
    for (const cell of cells) {
      expect(cell).toContain("width: 50%");
    }
  });

  it("每个图片单元计算 padding = 4px", async () => {
    const result = await renderMarkdown(TWO_IMAGE_DUO_MD, { themeId: "default" });
    const cells = extractCellStyles(result.html);
    for (const cell of cells) {
      expect(cell).toContain("padding: 4px");
    }
  });
});

// AC-002: triptych 变体 — 单行 3 个 table-cell / width 33.33% / padding 3px
describe("AC-002: triptych 变体单行 3 单元计算值", () => {
  it("3 张图片渲染出 1 个 table-row 内 3 个 table-cell", async () => {
    const result = await renderMarkdown(THREE_IMAGE_TRIPTYCH_MD, { themeId: "default" });
    const rows = extractRowStyles(result.html);
    const cells = extractCellStyles(result.html);
    expect(rows.length).toBe(1);
    expect(cells.length).toBe(3);
  });

  it("每个图片单元计算 width = 33.33%", async () => {
    const result = await renderMarkdown(THREE_IMAGE_TRIPTYCH_MD, { themeId: "default" });
    const cells = extractCellStyles(result.html);
    for (const cell of cells) {
      expect(cell).toContain("width: 33.33%");
    }
  });

  it("每个图片单元计算 padding = 3px", async () => {
    const result = await renderMarkdown(THREE_IMAGE_TRIPTYCH_MD, { themeId: "default" });
    const cells = extractCellStyles(result.html);
    for (const cell of cells) {
      expect(cell).toContain("padding: 3px");
    }
  });
});

// AC-003: triptych 变体 — 5 张图片按每 3 张一组换行，渲染 2 个 table-row
describe("AC-003: triptych 变体按每 3 张一组换行", () => {
  it("5 张图片渲染出 2 个 table-row", async () => {
    const result = await renderMarkdown(FIVE_IMAGE_TRIPTYCH_MD, { themeId: "default" });
    const rows = extractRowStyles(result.html);
    expect(rows.length).toBe(2);
  });

  it("第一组 table-row 含 3 个 table-cell，第二组含 2 个", async () => {
    const result = await renderMarkdown(FIVE_IMAGE_TRIPTYCH_MD, { themeId: "default" });
    const rowChunks = extractRowChunks(result.html);
    expect(rowChunks.length).toBe(2);
    const cells = extractCellStyles(result.html);
    expect(cells.length).toBe(5);
  });
});

// AC-004: caption 字段渲染独立 div，text-align center / font-size --font-size-sm / color --color-text-muted
describe("AC-004: 图片 caption 渲染独立居中说明", () => {
  it("含 caption 的图片渲染出独立 caption div", async () => {
    const result = await renderMarkdown(CAPTIONED_DUO_MD, { themeId: "default" });
    const captions = extractCaptionStyles(result.html);
    expect(captions.length).toBe(1);
  });

  it("caption div 计算 text-align = center", async () => {
    const result = await renderMarkdown(CAPTIONED_DUO_MD, { themeId: "default" });
    const captions = extractCaptionStyles(result.html);
    expect(captions[0]).toContain("text-align: center");
  });

  it("caption div 计算 font-size 等于 default 主题 --font-size-sm 实值（13px）", async () => {
    const result = await renderMarkdown(CAPTIONED_DUO_MD, { themeId: "default" });
    const captions = extractCaptionStyles(result.html);
    expect(captions[0]).toContain("font-size: 14px");
  });

  it("caption div 计算色值等于 default 主题 --color-text-muted 实值（#78716c）", async () => {
    const result = await renderMarkdown(CAPTIONED_DUO_MD, { themeId: "default" });
    const captions = extractCaptionStyles(result.html);
    expect(captions[0]).toContain("color: #78716c");
  });

  it("未含 caption 的图片不渲染 caption div", async () => {
    const result = await renderMarkdown(CAPTIONED_DUO_MD, { themeId: "default" });
    const captions = extractCaptionStyles(result.html);
    expect(captions.length).toBe(1);
  });
});

// AC-005: default 标准图集单列全宽堆叠，区别于 duo/triptych 多列 table 布局
describe("AC-005: default 变体单列全宽堆叠（非 table 多列）", () => {
  it("default 变体渲染不含任何 table 布局声明（display: table / table-row / table-cell）", async () => {
    const result = await renderMarkdown(THREE_IMAGE_DEFAULT_MD, { themeId: "default" });
    expect(result.html).not.toContain("display: table");
  });

  it("default 变体 3 张图片各渲染为全宽 img（width: 100%）", async () => {
    const result = await renderMarkdown(THREE_IMAGE_DEFAULT_MD, { themeId: "default" });
    const fullWidthImgs = [...result.html.matchAll(/<img[^>]*width: 100%[^>]*>/g)];
    expect(fullWidthImgs.length).toBe(3);
  });

  it("default 变体根容器计算 margin = 16px 0", async () => {
    const result = await renderMarkdown(THREE_IMAGE_DEFAULT_MD, { themeId: "default" });
    expect(result.html).toMatch(/data-variant="default"[^>]*margin: 16px 0/);
  });

  it("default 变体含 caption 的图片渲染独立居中说明", async () => {
    const result = await renderMarkdown(THREE_IMAGE_DEFAULT_MD, { themeId: "default" });
    const captions = extractCaptionStyles(result.html);
    expect(captions.length).toBe(1);
    expect(captions[0]).toContain("text-align: center");
  });
});
