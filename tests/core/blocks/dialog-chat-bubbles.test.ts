import { beforeEach, describe, expect, it } from "vitest";
import {
  describeBlock,
  renderMarkdown,
  resetBlockRegistry,
  resetVariantRegistry,
} from "../../../packages/core/src/index.ts";
import "../../../packages/blocks/src/index.ts";

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
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

const AVATAR_MD = [
  ':::dialog{.chat-bubbles speaker="对方" avatar="https://example.com/a.png"}',
  "你好呀",
  ":::",
  "",
  ':::dialog{.chat-bubbles speaker="己方" avatar="https://example.com/b.png"}',
  "你好，最近怎么样？",
  ":::",
].join("\n");

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

function extractRowOpenTagStyle(rowHtml: string): string {
  const match = rowHtml.match(
    /^<section data-block="dialog" data-variant="chat-bubbles"[^>]* style="([^"]*)"/
  );
  expect(match, `no row style found in: ${rowHtml}`).not.toBeNull();
  return match?.[1] ?? "";
}

function extractBubbleContainerStyles(html: string): string[] {
  const matches = [...html.matchAll(/<section style="([^"]*)"/g)].filter((m) =>
    m[1].includes("background:")
  );
  return matches.map((m) => m[1]);
}

function extractCellTextAligns(html: string): string[] {
  const matches = [...html.matchAll(/<section style="([^"]*text-align:[^"]*)">/g)];
  return matches.map((m) => {
    const alignMatch = m[1].match(/text-align:\s*([a-z]+)/);
    return alignMatch?.[1] ?? "";
  });
}

function extractAvatarTags(html: string): string[] {
  const matches = [...html.matchAll(/<img[^>]*data-dialog-avatar[^>]*>/g)];
  return matches.map((m) => m[0]);
}

// AC-001: variants 数组不再含 bubble，改为 chat-bubbles
describe("AC-001: dialog variants 数组以 chat-bubbles 替代 bubble", () => {
  it("describeBlock('dialog').variants 不含 id 为 bubble 的变体", () => {
    const def = describeBlock("dialog");
    const found = def?.variants.find((v) => v.id === "bubble");
    expect(found).toBeUndefined();
  });

  it("describeBlock('dialog').variants 含 id 为 chat-bubbles 的变体", () => {
    const def = describeBlock("dialog");
    const found = def?.variants.find((v) => v.id === "chat-bubbles");
    expect(found?.id).toBe("chat-bubbles");
  });
});

// AC-002: 第一位 speaker 贴左，背景 --color-surface-alt
describe("AC-002: 首位 speaker 气泡贴左且背景为 surface-alt 实值", () => {
  it("首条消息内容 cell 计算 text-align = left", async () => {
    const result = await renderMarkdown(TWO_MESSAGE_MD, { themeId: "default" });
    const aligns = extractCellTextAligns(result.html);
    expect(aligns.length).toBe(2);
    expect(aligns[0]).toBe("left");
  });

  it("首条消息气泡计算 background = default 主题 --color-surface-alt 实值（#f3f0eb）", async () => {
    const result = await renderMarkdown(TWO_MESSAGE_MD, { themeId: "default" });
    const styles = extractBubbleContainerStyles(result.html);
    expect(styles[0]).toContain("background: #f3f0eb");
  });
});

// AC-003: 第二位不同 speaker 贴右，背景 --color-brand，文字 --color-text-inverse
describe("AC-003: 次位不同 speaker 气泡贴右且背景/文字色为交替实值", () => {
  it("第二条消息（不同 speaker）内容 cell 计算 text-align = right", async () => {
    const result = await renderMarkdown(TWO_MESSAGE_MD, { themeId: "default" });
    const aligns = extractCellTextAligns(result.html);
    expect(aligns[1]).toBe("right");
  });

  it("第二条消息气泡计算 background = default 主题 --color-brand 实值（#2d5a4e）", async () => {
    const result = await renderMarkdown(TWO_MESSAGE_MD, { themeId: "default" });
    const styles = extractBubbleContainerStyles(result.html);
    expect(styles[1]).toContain("background: #2d5a4e");
  });

  it("第二条消息气泡计算文字色 = default 主题 --color-text-inverse 实值（#fafaf9）", async () => {
    const result = await renderMarkdown(TWO_MESSAGE_MD, { themeId: "default" });
    const styles = extractBubbleContainerStyles(result.html);
    expect(styles[1]).toContain("color: #fafaf9");
  });
});

// AC-004: 气泡容器 border-radius 12px / max-width 80% / display inline-block
describe("AC-004: 气泡容器布局基础参数", () => {
  it("气泡容器计算 border-radius = 12px", async () => {
    const result = await renderMarkdown(TWO_MESSAGE_MD, { themeId: "default" });
    const styles = extractBubbleContainerStyles(result.html);
    for (const style of styles) {
      expect(style).toContain("border-radius: 12px");
    }
  });

  it("气泡容器计算 max-width 对应 80%", async () => {
    const result = await renderMarkdown(TWO_MESSAGE_MD, { themeId: "default" });
    const styles = extractBubbleContainerStyles(result.html);
    for (const style of styles) {
      expect(style).toContain("max-width: 80%");
    }
  });

  it("气泡容器计算 display = inline-block", async () => {
    const result = await renderMarkdown(TWO_MESSAGE_MD, { themeId: "default" });
    const styles = extractBubbleContainerStyles(result.html);
    for (const style of styles) {
      expect(style).toContain("display: inline-block");
    }
  });
});

// AC-005: avatar 字段渲染 24px 圆形头像，左侧气泡头像在左，右侧气泡头像在右
describe("AC-005: avatar 字段渲染圆形头像并按侧位排列", () => {
  it("传入 avatar 时渲染 img 头像元素计算 border-radius = 50%", async () => {
    const result = await renderMarkdown(AVATAR_MD, { themeId: "default" });
    const tags = extractAvatarTags(result.html);
    expect(tags.length).toBe(2);
    for (const tag of tags) {
      expect(tag).toContain("border-radius: 50%");
    }
  });

  it("传入 avatar 时渲染 img 头像元素宽高属性均为 24", async () => {
    const result = await renderMarkdown(AVATAR_MD, { themeId: "default" });
    const tags = extractAvatarTags(result.html);
    for (const tag of tags) {
      expect(tag).toContain('width="24"');
      expect(tag).toContain('height="24"');
    }
  });

  it("左侧气泡（首位 speaker）头像出现在气泡文本之前（头像在左）", async () => {
    const result = await renderMarkdown(AVATAR_MD, { themeId: "default" });
    const avatarIndex = result.html.indexOf("data-dialog-avatar");
    const textIndex = result.html.indexOf("你好呀");
    expect(avatarIndex).toBeGreaterThan(-1);
    expect(avatarIndex).toBeLessThan(textIndex);
  });

  it("右侧气泡（次位不同 speaker）头像出现在气泡文本之后（头像在右）", async () => {
    const result = await renderMarkdown(AVATAR_MD, { themeId: "default" });
    const textIndex = result.html.indexOf("你好，最近怎么样？");
    const secondAvatarIndex = result.html.indexOf("data-dialog-avatar", textIndex);
    expect(secondAvatarIndex).toBeGreaterThan(textIndex);
  });

  it("未传 avatar 字段时不渲染头像元素", async () => {
    const result = await renderMarkdown(TWO_MESSAGE_MD, { themeId: "default" });
    expect(result.html).not.toContain("data-dialog-avatar");
  });
});

// AC-006: 每条消息独立一行块级容器，消息间 margin-bottom 8px
describe("AC-006: 消息行块级独立且间距 8px", () => {
  it("每条消息外层块级容器计算 display = table", async () => {
    const result = await renderMarkdown(TWO_MESSAGE_MD, { themeId: "default" });
    const rows = extractDialogRows(result.html);
    expect(rows.length).toBe(2);
    for (const row of rows) {
      expect(extractRowOpenTagStyle(row)).toContain("display: table");
    }
  });

  it("消息行之间计算 margin-bottom = 8px", async () => {
    const result = await renderMarkdown(TWO_MESSAGE_MD, { themeId: "default" });
    const rows = extractDialogRows(result.html);
    for (const row of rows) {
      expect(extractRowOpenTagStyle(row)).toContain("margin-bottom: 8px");
    }
  });
});
