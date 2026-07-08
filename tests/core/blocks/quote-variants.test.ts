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

// AC-001: quote.variants 不再含 magazine/literary，改为 large-quote-mark/dropcap
describe("AC-001: quote 变体重命名为 large-quote-mark/dropcap", () => {
  it("quote.variants 的 id 集合含 large-quote-mark 与 dropcap", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const def = describeBlock("quote");
    const ids = (def?.variants ?? []).map((v) => v.id);
    expect(ids).toContain("large-quote-mark");
    expect(ids).toContain("dropcap");
  });

  it("quote.variants 不再含旧变体 ID magazine/literary", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const def = describeBlock("quote");
    const ids = (def?.variants ?? []).map((v) => v.id);
    expect(ids).not.toContain("magazine");
    expect(ids).not.toContain("literary");
  });
});

// AC-002: large-quote-mark 变体渲染大引号装饰 — 字符「"」+ font-size 2em 换算值 + opacity 0.4 + 主题 --color-brand 色值
describe("AC-002: quote large-quote-mark 变体渲染大引号装饰", () => {
  it('渲染后 HTML 含引号文本字符「"」', async () => {
    const result = await renderMarkdown(":::quote{.large-quote-mark}\n引用文字\n:::", {
      themeId: "default",
    });
    expect(result.html).toContain('"');
  });

  it("引号装饰元素计算 font-size 换算值等于 2em", async () => {
    const result = await renderMarkdown(":::quote{.large-quote-mark}\n引用文字\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<span style="([^"]*)">"<\/span>/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toContain("font-size: 32px");
  });

  it("引号装饰元素计算 opacity = 0.4", async () => {
    const result = await renderMarkdown(":::quote{.large-quote-mark}\n引用文字\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<span style="([^"]*)">"<\/span>/);
    expect(match?.[1]).toContain("opacity: 0.4");
  });

  it("引号装饰元素色值计算值等于 default 主题 --color-brand（#2d5a4e）", async () => {
    const result = await renderMarkdown(":::quote{.large-quote-mark}\n引用文字\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<span style="([^"]*)">"<\/span>/);
    expect(match?.[1]).toContain("color: #2d5a4e");
  });
});

// AC-003: dropcap 变体渲染首字下沉装饰 — 首字符独立 table-cell <div>（§9.8 悬挂布局）+ font-size 2.2em 换算值 + font-weight 700 + 主题 --color-brand 色值 + 主题 --font-family-heading 计算值
describe("AC-003: quote dropcap 变体渲染首字下沉装饰", () => {
  it("渲染后 HTML 含首字符独立 table-cell <div>", async () => {
    const result = await renderMarkdown(":::quote{.dropcap}\n引用文字\n:::", {
      themeId: "default",
    });
    expect(result.html).toMatch(/<section style="[^"]*">引<\/section>/);
  });

  it("首字符装饰元素计算 font-size 换算值等于 2.2em", async () => {
    const result = await renderMarkdown(":::quote{.dropcap}\n引用文字\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<section style="([^"]*)">引<\/section>/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toContain("font-size: 35.2px");
  });

  it("首字符装饰元素计算 font-weight = 700", async () => {
    const result = await renderMarkdown(":::quote{.dropcap}\n引用文字\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<section style="([^"]*)">引<\/section>/);
    expect(match?.[1]).toContain("font-weight: 700");
  });

  it("首字符装饰元素色值计算值等于 default 主题 --color-brand（#2d5a4e）", async () => {
    const result = await renderMarkdown(":::quote{.dropcap}\n引用文字\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<section style="([^"]*)">引<\/section>/);
    expect(match?.[1]).toContain("color: #2d5a4e");
  });

  it("首字符装饰元素不含 font-family 声明（output 相剥除，微信系统字体接管）", async () => {
    const result = await renderMarkdown(":::quote{.dropcap}\n引用文字\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<section style="([^"]*)">引<\/section>/);
    expect(match?.[1]).not.toContain("font-family");
  });

  it("首字符抽离后剩余文字保留在原位置", async () => {
    const result = await renderMarkdown(":::quote{.dropcap}\n引用文字\n:::", {
      themeId: "default",
    });
    expect(result.html).toContain("用文字");
  });
});

// AC-004: 两变体渲染产物均不含 float 声明（通则合规验证）
describe("AC-004: large-quote-mark/dropcap 渲染产物不含 float 声明", () => {
  it("large-quote-mark 渲染后 HTML 不含 float 声明", async () => {
    const result = await renderMarkdown(":::quote{.large-quote-mark}\n引用文字\n:::", {
      themeId: "default",
    });
    expect(result.html).not.toMatch(/float\s*:/);
  });

  it("dropcap 渲染后 HTML 不含 float 声明", async () => {
    const result = await renderMarkdown(":::quote{.dropcap}\n引用文字\n:::", {
      themeId: "default",
    });
    expect(result.html).not.toMatch(/float\s*:/);
  });
});
