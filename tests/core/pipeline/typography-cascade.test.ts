import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  renderMarkdown,
  resetBlockRegistry,
  resetVariantRegistry,
  wechatAdapter,
} from "../../../packages/core/src/index.ts";
import "../../../packages/blocks/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";

const PULL_QUOTE_DECORATED_MD = ':::pull-quote{.decorated author="鲁迅"}\n从来如此，便对么？\n:::';

const QUOTE_LARGE_MARK_MD = ":::quote{.large-quote-mark}\n从来如此，便对么？\n:::";

const PLAIN_PARAGRAPH_MD = "这是一段普通段落。";

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

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
});

describe("AC-001: 容器 typography 下推 — text-align 覆盖 tag token 且 slot 元素不受破坏", () => {
  it("pull-quote decorated 正文 <p> inline style 含 text-align: center（容器 root 下推，覆盖 tag token 的 left）", async () => {
    const result = await renderMarkdown(PULL_QUOTE_DECORATED_MD, { theme: defaultTheme });
    const pMatch = result.html.match(/<p style="([^"]*)">/);
    expect(pMatch).not.toBeNull();
    expect(pMatch?.[1]).toContain("text-align: center");
    expect(pMatch?.[1]).not.toContain("text-align: left");
  });

  it("pull-quote decorated 署名行 slot 元素样式不被容器下推覆盖破坏（slot 自身声明优先）", async () => {
    const result = await renderMarkdown(PULL_QUOTE_DECORATED_MD, { theme: defaultTheme });
    const authorMatch = result.html.match(/<section style="([^"]*)">—— 鲁迅<\/section>/);
    expect(authorMatch).not.toBeNull();
    expect(authorMatch?.[1]).toContain("font-size: 14px");
    expect(authorMatch?.[1]).not.toContain("font-size: 20px");
  });
});

describe("AC-002: 容器 typography 下推 — font-size 覆盖 tag token", () => {
  it("pull-quote decorated 正文 <p> inline style 含 font-size: 1.25em（容器 root 声明，覆盖 tag token 的 15px）", async () => {
    const result = await renderMarkdown(PULL_QUOTE_DECORATED_MD, { theme: defaultTheme });
    const pMatch = result.html.match(/<p style="([^"]*)">/);
    expect(pMatch).not.toBeNull();
    expect(pMatch?.[1]).toContain("font-size: 20px");
    expect(pMatch?.[1]).not.toContain("font-size: 15px");
  });
});

describe("AC-003: 容器 typography 下推 — color 覆盖 tag token（quote large-quote-mark）", () => {
  it("quote large-quote-mark 正文 <p> inline style 含 color: #555（容器 root 声明色值，覆盖 tag token 的 #1c1917）", async () => {
    const result = await renderMarkdown(QUOTE_LARGE_MARK_MD, { theme: defaultTheme });
    const pMatch = result.html.match(/<p style="([^"]*)">/);
    expect(pMatch).not.toBeNull();
    expect(pMatch?.[1]).toContain("color: #555");
    expect(pMatch?.[1]).not.toContain("color: #1c1917");
  });
});

describe("AC-004 regression-guard: 非容器上下文普通元素样式 byte-identical 不变", () => {
  it("纯段落（无容器块）渲染 HTML 与现状字节级一致", async () => {
    const result = await renderMarkdown(PLAIN_PARAGRAPH_MD, { theme: defaultTheme });
    expect(sha256(result.html)).toBe(
      "f0649874fc37306c461bca977dbef6a31f4e641bcf0b86c2d98e909456ee1582"
    );
  });

  it("多元素代表性文档（标题/段落/引用/代码块/分隔线）渲染 SHA-256 与基线一致", async () => {
    const result = await renderMarkdown(REPRESENTATIVE_MD, { theme: defaultTheme });
    expect(sha256(result.html)).toBe(
      "a6dadcd25458c3b1863bb6bb8be313ad1c796e78035cec71be222e125a55e9b3"
    );
  });
});

describe("AC-005: 平台过滤后下推的 text-align 属性完整保留", () => {
  it("pull-quote decorated 渲染产物经 wechatAdapter.inspect 后，正文 <p> style 仍含 text-align: center", async () => {
    const result = await renderMarkdown(PULL_QUOTE_DECORATED_MD, { theme: defaultTheme });
    const { patchedHtml } = wechatAdapter.inspect(result.html);
    const pMatch = patchedHtml.match(/<p style="([^"]*)">/);
    expect(pMatch).not.toBeNull();
    expect(pMatch?.[1]).toContain("text-align: center");
  });
});
