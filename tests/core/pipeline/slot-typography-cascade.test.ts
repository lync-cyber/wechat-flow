import { createHash } from "node:crypto";
import type { ThemeDefinition } from "@wechat-flow/contracts";
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
import literaryTheme from "../../../packages/themes/literary/src/index.ts";

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
  resetThemeRegistry();
  registerTheme(defaultTheme);
  registerTheme(literaryTheme);
});

const TWO_MESSAGE_MD = [
  ':::dialog{.chat-bubbles speaker="对方"}',
  "你好呀",
  ":::",
  "",
  ':::dialog{.chat-bubbles speaker="己方"}',
  "你好，最近怎么样？",
  ":::",
].join("\n");

const STEPS_MD = `:::steps{.card}
- **步骤一**：描述一
- **步骤二**：描述二
:::`;

const MIXED_PARAGRAPH_AND_STEPS_MD = `这是同文档内的普通段落，用于比对行高基线。

${STEPS_MD}`;

// distinctPrimaryTheme deliberately diverges --color-text-primary from the hardcoded
// p.default color baked into defaultTheme.blocks.p, so a passing assertion proves the
// value flowed through the slot's token-resolved declaration rather than coinciding with
// the tag-path default.
const distinctPrimaryTheme: ThemeDefinition = {
  ...defaultTheme,
  id: "slot-cascade-distinct-primary",
  tokens: {
    ...defaultTheme.tokens,
    "--color-text-primary": "#204060",
  },
};

function extractDialogRows(html: string): string[] {
  const matches = [
    ...html.matchAll(/<section data-block="dialog" data-variant="chat-bubbles"[^>]*>/g),
  ];
  const starts = matches.map((m) => m.index ?? 0);
  return starts.map((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : html.length;
    return html.slice(start, end);
  });
}

function extractParagraphStyle(rowHtml: string): string {
  const match = rowHtml.match(/<p style="([^"]*)"/);
  expect(match, `no <p> style found in row: ${rowHtml}`).not.toBeNull();
  return match?.[1] ?? "";
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

function extractFirstParagraphStyle(html: string): string {
  const match = html.match(/<p style="([^"]*)"/);
  expect(match, `no <p> style found in html: ${html}`).not.toBeNull();
  return match?.[1] ?? "";
}

// AC-001: dialog chat-bubbles 气泡槽位声明的 color 下推至内层 <p>，不再被全局 p 色覆盖
describe("AC-001: dialog chat-bubbles 气泡槽位 color 下推至内层 <p>", () => {
  it("己方（右）气泡内 <p> 计算 color 等于 default 主题 --color-text-inverse 实值（#fafaf9），不再是全局 p 默认色（#1c1917）", async () => {
    const result = await renderMarkdown(TWO_MESSAGE_MD, { themeId: "default" });
    const rows = extractDialogRows(result.html);
    expect(rows.length).toBe(2);
    const rightParagraphStyle = extractParagraphStyle(rows[1] ?? "");
    expect(rightParagraphStyle).toContain("color: #fafaf9");
    expect(rightParagraphStyle).not.toContain("color: #1c1917");
  });

  it("己方（右）气泡内 <p> 计算 text-align 保持 left，不被 cell-right 的 text-align:right 下推污染", async () => {
    const result = await renderMarkdown(TWO_MESSAGE_MD, { themeId: "default" });
    const rows = extractDialogRows(result.html);
    const rightParagraphStyle = extractParagraphStyle(rows[1] ?? "");
    expect(rightParagraphStyle).toContain("text-align: left");
    expect(rightParagraphStyle).not.toContain("text-align: right");
  });

  it("对方（左）气泡内 <p> 计算 color 来自槽位下推链（用 --color-text-primary 与 p 默认色不同的自定义主题验证真实下推，非巧合相等）", async () => {
    const result = await renderMarkdown(TWO_MESSAGE_MD, { theme: distinctPrimaryTheme });
    const rows = extractDialogRows(result.html);
    const leftParagraphStyle = extractParagraphStyle(rows[0] ?? "");
    expect(leftParagraphStyle).toContain("color: #204060");
  });

  it("cross-theme：literary 主题下己方（右）气泡内 <p> 计算 color 等于该主题 --color-text-inverse 实值（#f9f5ee）", async () => {
    const result = await renderMarkdown(TWO_MESSAGE_MD, { theme: literaryTheme });
    const rows = extractDialogRows(result.html);
    const rightParagraphStyle = extractParagraphStyle(rows[1] ?? "");
    expect(rightParagraphStyle).toContain("color: #f9f5ee");
    expect(rightParagraphStyle).not.toContain("color: #2c1f0a");
  });
});

// AC-002: steps card title/description 槽位 line-height 注入主题正文行高链，非独立声明覆盖
describe("AC-002: steps card title/description 槽位 line-height 与同文档普通段落一致", () => {
  it("title/description 槽位计算 line-height 与同文档普通段落计算 line-height 一致（default 主题均为 1.85）", async () => {
    const result = await renderMarkdown(MIXED_PARAGRAPH_AND_STEPS_MD, { themeId: "default" });
    const paragraphStyle = extractFirstParagraphStyle(result.html);
    expect(paragraphStyle).toContain("line-height: 1.85");

    const titleStyle = extractSlotStyle(result.html, "title", 0);
    const descriptionStyle = extractSlotStyle(result.html, "description", 0);
    expect(titleStyle).toContain("line-height: 1.85");
    expect(descriptionStyle).toContain("line-height: 1.85");
  });

  it("description 槽位保持自身声明的 font-size（14px）与 color（#44403c），不被行高注入覆盖", async () => {
    const result = await renderMarkdown(STEPS_MD, { themeId: "default" });
    const descriptionStyle = extractSlotStyle(result.html, "description", 0);
    expect(descriptionStyle).toContain("font-size: 14px");
    expect(descriptionStyle).toContain("color: #44403c");
    expect(descriptionStyle).toContain("line-height: 1.85");
  });

  it("title 槽位保持自身声明的 font-weight（600）且新增 line-height 计算值 1.85", async () => {
    const result = await renderMarkdown(STEPS_MD, { themeId: "default" });
    const titleStyle = extractSlotStyle(result.html, "title", 0);
    expect(titleStyle).toContain("font-weight: 600");
    expect(titleStyle).toContain("line-height: 1.85");
  });

  it("cross-theme：literary 主题下 title/description 槽位计算 line-height 等于该主题正文行高链实值（2），而非写死的 default 值", async () => {
    const result = await renderMarkdown(STEPS_MD, { theme: literaryTheme });
    const titleStyle = extractSlotStyle(result.html, "title", 0);
    const descriptionStyle = extractSlotStyle(result.html, "description", 0);
    expect(titleStyle).toContain("line-height: 2");
    expect(descriptionStyle).toContain("line-height: 2");
    expect(titleStyle).not.toContain("line-height: 1.85");
    expect(descriptionStyle).not.toContain("line-height: 1.85");
  });
});

// AC-003: 机制与容器路径同构 — 无 slot 场景渲染产物字节级不变
const REPRESENTATIVE_MD = `# 一级标题

## 二级标题

这是一段普通段落，包含**粗体**和*斜体*文字。

> 这是一段引用内容，用于测试 blockquote 样式

\`\`\`
const code = 'code block';
\`\`\`

---
`;

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

describe("AC-003: 无 slot 的代表性 Markdown 渲染 SHA-256 与既有回归基线一致（机制复用不引入 slot 特化分支散点）", () => {
  const BASELINE_HASH_DEFAULT = "a6dadcd25458c3b1863bb6bb8be313ad1c796e78035cec71be222e125a55e9b3";

  it("default theme：无 slot 渲染 SHA-256 与 AC-T120-002 回归基线一致", async () => {
    const result = await renderMarkdown(REPRESENTATIVE_MD, { theme: defaultTheme });
    expect(sha256(result.html)).toBe(BASELINE_HASH_DEFAULT);
  });
});

// 边界警示 2: 已声明 line-height 的槽位不被容器/环境缺省注入覆盖
describe("边界: 已声明 line-height 的装饰槽位不被容器缺省注入覆盖", () => {
  it("quote large-quote-mark 变体 quote-mark 槽位保持自身声明 line-height=0.6，不被主题正文行高（1.85）覆写", async () => {
    const result = await renderMarkdown(":::quote{.large-quote-mark}\n引用文字\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<span style="([^"]*)">"<\/span>/);
    expect(match).not.toBeNull();
    const quoteMarkStyle = match?.[1] ?? "";
    expect(quoteMarkStyle).toContain("line-height: 0.6");
    expect(quoteMarkStyle).not.toContain("line-height: 1.85");
  });
});

// 边界警示 3: slotLineHeightExempt 判据源为「合并后计算值」而非「槽位自身声明」——
// 继承链（blockInherited）携带的低于可读性下限行高同样触发豁免。
const lowContainerLineHeightTheme: ThemeDefinition = {
  ...defaultTheme,
  id: "slot-cascade-low-container-lh",
  blocks: {
    ...defaultTheme.blocks,
    steps: { card: { "line-height": "0.9" } },
  },
};

describe("边界: 豁免判据取合并后计算值 — 继承链携带的低行高亦触发", () => {
  it("steps card 容器声明 line-height=0.9（槽位自身不声明），title 槽位继承后 0.9 越过 output clamp 存活（判据基于合并值非槽位自声明，否则会被抬至下限 1.2）", async () => {
    const result = await renderMarkdown(STEPS_MD, { theme: lowContainerLineHeightTheme });
    const titleStyle = extractSlotStyle(result.html, "title", 0);
    const descriptionStyle = extractSlotStyle(result.html, "description", 0);
    expect(titleStyle).toContain("line-height: 0.9");
    expect(titleStyle).not.toContain("line-height: 1.2");
    expect(descriptionStyle).toContain("line-height: 0.9");
    expect(descriptionStyle).not.toContain("line-height: 1.2");
  });
});

// 边界警示 4: bodyBaseline 在 themeTokens 缺 p.default 时优雅退化为空 — 槽位仍渲染自身声明，不崩溃
describe("边界: themeTokens 缺 p.default 时 bodyBaseline 退化，槽位保留自身声明", () => {
  const blocksWithoutP = Object.fromEntries(
    Object.entries(defaultTheme.blocks ?? {}).filter(([selector]) => selector !== "p")
  );
  const noBaselineTheme: ThemeDefinition = {
    ...defaultTheme,
    id: "slot-cascade-no-baseline",
    blocks: blocksWithoutP,
  };

  it("blocks 缺 p 时己方气泡内 <p> 仍带槽位声明色 #fafaf9，且不再获正文基线 line-height:1.85 注入", async () => {
    const result = await renderMarkdown(TWO_MESSAGE_MD, { theme: noBaselineTheme });
    const rows = extractDialogRows(result.html);
    expect(rows.length).toBe(2);
    const rightParagraphStyle = extractParagraphStyle(rows[1] ?? "");
    expect(rightParagraphStyle).toContain("color: #fafaf9");
    expect(rightParagraphStyle).not.toContain("line-height: 1.85");
  });
});
