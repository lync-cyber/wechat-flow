import { beforeEach, describe, expect, it } from "vitest";
import {
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

const STEPS_MD = `:::steps{.card}
- **步骤一**：描述一
- **步骤二**：描述二
- **步骤三**：描述三
:::`;

function extractStepCardStyles(html: string): string[] {
  const matches = [
    ...html.matchAll(/<section data-block="steps" data-variant="card"[^>]* style="([^"]*)"/g),
  ];
  return matches.map((m) => m[1]);
}

function extractStepCardChunks(html: string): string[] {
  const openTagRe = /<section data-block="steps" data-variant="card"[^>]*>/g;
  const opens = [...html.matchAll(openTagRe)];
  const chunks: string[] = [];
  for (let i = 0; i < opens.length; i++) {
    const start = (opens[i]?.index ?? 0) + (opens[i]?.[0].length ?? 0);
    const end = i + 1 < opens.length ? opens[i + 1]?.index : html.length;
    chunks.push(html.slice(start, end));
  }
  return chunks;
}

function extractSlotStyle(html: string, slot: "title" | "description", index: number): string {
  const chunks = extractStepCardChunks(html);
  const chunk = chunks[index];
  expect(chunk, `no step card chunk at index ${index} found in html: ${html}`).toBeDefined();
  const innerSections = [...(chunk ?? "").matchAll(/<section style="([^"]*)">/g)];
  const slotIndex = slot === "title" ? 0 : 1;
  const match = innerSections[slotIndex];
  expect(
    match,
    `no ${slot} section (position ${slotIndex}) found in card chunk ${index}: ${chunk}`
  ).toBeDefined();
  return match?.[1] ?? "";
}

// AC-001: card 每个 step 项 — 背景/border/border-radius
describe("AC-001: card 每个 step 项渲染背景/border/border-radius", () => {
  it("getBlockBaseStyle('steps','card') 的 background 计算值为 --color-surface-alt 主题实值", () => {
    const base = getBlockBaseStyle("steps", "card");
    expect(base.background).toBe("#F3F0EB");
  });

  it("getBlockBaseStyle('steps','card') 的 border 计算值含 1px solid 与 --color-border 主题实值", () => {
    const base = getBlockBaseStyle("steps", "card");
    expect(base.border).toContain("1px solid");
    expect(base.border).toContain("#D6D3CE");
  });

  it("getBlockBaseStyle('steps','card') 的 border-radius 计算值等于 default 主题 --decoration-border-radius-md", () => {
    const base = getBlockBaseStyle("steps", "card");
    expect(base["border-radius"]).toBe("6px");
  });

  it("渲染多个 step 项后每个 step 卡片 style 均含 background/border/border-radius 计算值", async () => {
    const result = await renderMarkdown(STEPS_MD, { themeId: "default" });
    const cardStyles = extractStepCardStyles(result.html);
    expect(cardStyles.length).toBe(3);
    for (const style of cardStyles) {
      expect(style).toContain("background: #F3F0EB");
      expect(style).toContain("border: 1px solid #D6D3CE");
      expect(style).toContain("border-radius: 6px");
    }
  });
});

// AC-002: 卡片间 margin-bottom 12px，最后一项 margin-bottom 0
describe("AC-002: step 卡片间距 12px，最后一项 margin-bottom 归零", () => {
  it("渲染 3 个 step 项后前两项卡片 margin-bottom 计算值为 12px", async () => {
    const result = await renderMarkdown(STEPS_MD, { themeId: "default" });
    const cardStyles = extractStepCardStyles(result.html);
    expect(cardStyles[0]).toContain("margin-bottom: 12px");
    expect(cardStyles[1]).toContain("margin-bottom: 12px");
  });

  it("渲染 3 个 step 项后最后一项卡片 margin-bottom 计算值为 0", async () => {
    const result = await renderMarkdown(STEPS_MD, { themeId: "default" });
    const cardStyles = extractStepCardStyles(result.html);
    expect(cardStyles[2]).toContain("margin-bottom: 0");
    expect(cardStyles[2]).not.toContain("margin-bottom: 12px");
  });
});

// AC-003: title 字重 600 / description 色值+字号计算值
describe("AC-003: 卡片内 title 字重与 description 色值/字号计算值", () => {
  it("每张卡片 title 元素计算 font-weight = 600", async () => {
    const result = await renderMarkdown(STEPS_MD, { themeId: "default" });
    for (let i = 0; i < 3; i++) {
      const style = extractSlotStyle(result.html, "title", i);
      expect(style).toContain("font-weight: 600");
    }
  });

  it("每张卡片 description 元素计算色值等于 default 主题 --color-text-secondary（#44403C）", async () => {
    const result = await renderMarkdown(STEPS_MD, { themeId: "default" });
    for (let i = 0; i < 3; i++) {
      const style = extractSlotStyle(result.html, "description", i);
      expect(style).toContain("color: #44403C");
    }
  });

  it("每张卡片 description 元素计算字号等于 default 主题 --font-size-sm（13px）", async () => {
    const result = await renderMarkdown(STEPS_MD, { themeId: "default" });
    for (let i = 0; i < 3; i++) {
      const style = extractSlotStyle(result.html, "description", i);
      expect(style).toContain("font-size: 13px");
    }
  });
});
