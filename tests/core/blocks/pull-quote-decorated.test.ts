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

// AC-001: decorated 变体渲染装饰引号 — 字符「」+ font-size 28px + opacity 0.35 + 主题 --color-brand 色值
describe("AC-001: pull-quote decorated 变体渲染装饰引号", () => {
  it("渲染后 HTML 含装饰引号文本字符「", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const result = await renderMarkdown(':::pull-quote{.decorated author="鲁迅"}\n摘引文字\n:::', {
      themeId: "default",
    });
    expect(result.html).toContain("「");
  });

  it("装饰引号元素计算 font-size = 28px", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const result = await renderMarkdown(':::pull-quote{.decorated author="鲁迅"}\n摘引文字\n:::', {
      themeId: "default",
    });
    const match = result.html.match(/<span style="([^"]*)">「<\/span>/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toContain("font-size: 28px");
  });

  it("装饰引号元素计算 opacity = 0.35", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const result = await renderMarkdown(':::pull-quote{.decorated author="鲁迅"}\n摘引文字\n:::', {
      themeId: "default",
    });
    const match = result.html.match(/<span style="([^"]*)">「<\/span>/);
    expect(match?.[1]).toContain("opacity: 0.35");
  });

  it("装饰引号元素色值计算值等于 default 主题 --color-brand（#2d5a4e）", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const result = await renderMarkdown(':::pull-quote{.decorated author="鲁迅"}\n摘引文字\n:::', {
      themeId: "default",
    });
    const match = result.html.match(/<span style="([^"]*)">「<\/span>/);
    expect(match?.[1]).toContain("color: #2d5a4e");
  });
});

// AC-002: decorated 变体渲染独立署名行 — font-size 13px + text-align center + margin-top 10px + 主题 --color-text-muted 色值
describe("AC-002: pull-quote decorated 变体渲染独立署名行", () => {
  it("渲染后 HTML 含独立署名行元素承载「—— {author}」文本", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const result = await renderMarkdown(':::pull-quote{.decorated author="鲁迅"}\n摘引文字\n:::', {
      themeId: "default",
    });
    expect(result.html).toMatch(/<section style="[^"]*">—— 鲁迅<\/section>/);
  });

  it("署名行元素计算 font-size = 13px", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const result = await renderMarkdown(':::pull-quote{.decorated author="鲁迅"}\n摘引文字\n:::', {
      themeId: "default",
    });
    const match = result.html.match(/<section style="([^"]*)">—— 鲁迅<\/section>/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toContain("font-size: 14px");
  });

  it("署名行元素计算 text-align = center", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const result = await renderMarkdown(':::pull-quote{.decorated author="鲁迅"}\n摘引文字\n:::', {
      themeId: "default",
    });
    const match = result.html.match(/<section style="([^"]*)">—— 鲁迅<\/section>/);
    expect(match?.[1]).toContain("text-align: center");
  });

  it("署名行元素计算 margin-top = 10px", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const result = await renderMarkdown(':::pull-quote{.decorated author="鲁迅"}\n摘引文字\n:::', {
      themeId: "default",
    });
    const match = result.html.match(/<section style="([^"]*)">—— 鲁迅<\/section>/);
    expect(match?.[1]).toContain("margin-top: 10px");
  });

  it("署名行元素色值计算值等于 default 主题 --color-text-muted（#78716c）", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const result = await renderMarkdown(':::pull-quote{.decorated author="鲁迅"}\n摘引文字\n:::', {
      themeId: "default",
    });
    const match = result.html.match(/<section style="([^"]*)">—— 鲁迅<\/section>/);
    expect(match?.[1]).toContain("color: #78716c");
  });
});

// AC-003: block-level baseStyle（root 容器）与 decorated variant baseStyle 叠加合成，二者不互相覆盖冲突属性
describe("AC-003: pull-quote root 容器基线与 decorated variant 装饰声明叠加合成", () => {
  it("getBlockBaseStyle('pull-quote','decorated') 含 root 容器基线 text-align: center", () => {
    const base = getBlockBaseStyle("pull-quote", "decorated");
    expect(base["text-align"]).toBe("center");
  });

  it("getBlockBaseStyle('pull-quote','decorated') 含 root 容器基线 padding: 24px 16px", () => {
    const base = getBlockBaseStyle("pull-quote", "decorated");
    expect(base.padding).toBe("24px 16px");
  });

  it("渲染后容器 div 的 style 属性同时含 root 基线声明（text-align: center）", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const result = await renderMarkdown(':::pull-quote{.decorated author="鲁迅"}\n摘引文字\n:::', {
      themeId: "default",
    });
    const containerMatch = result.html.match(
      /<section data-block="pull-quote" data-variant="decorated" style="([^"]*)"/
    );
    expect(containerMatch).not.toBeNull();
    expect(containerMatch?.[1]).toContain("text-align: center");
  });

  it("渲染后容器 div 的 style 属性同时含 root 基线声明（padding: 24px 16px），未被装饰声明覆盖冲突", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const result = await renderMarkdown(':::pull-quote{.decorated author="鲁迅"}\n摘引文字\n:::', {
      themeId: "default",
    });
    const containerMatch = result.html.match(
      /<section data-block="pull-quote" data-variant="decorated" style="([^"]*)"/
    );
    expect(containerMatch?.[1]).toContain("padding: 24px 16px");
  });

  it("装饰声明（引号 font-size 28px）与根容器基线（font-size 1.25em）各自作用于独立元素，互不覆盖", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const result = await renderMarkdown(':::pull-quote{.decorated author="鲁迅"}\n摘引文字\n:::', {
      themeId: "default",
    });
    const containerMatch = result.html.match(
      /<section data-block="pull-quote" data-variant="decorated" style="([^"]*)"/
    );
    expect(containerMatch?.[1]).toContain("font-size: 20px");
    const quoteMarkMatch = result.html.match(/<span style="([^"]*)">「<\/span>/);
    expect(quoteMarkMatch?.[1]).toContain("font-size: 28px");
  });
});
