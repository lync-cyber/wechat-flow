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

// AC-001: paragraph.variants 新增 dropcap，渲染后首字符独立 table-cell <div>（§9.8 悬挂布局），font-size 2.2em、display table-cell、vertical-align top
describe("AC-001: paragraph dropcap 变体渲染首字符独立悬挂 cell", () => {
  it("paragraph.variants 的 id 集合含 dropcap", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const def = describeBlock("paragraph");
    const ids = (def?.variants ?? []).map((v) => v.id);
    expect(ids).toContain("dropcap");
  });

  it("渲染后 HTML 含首字符独立 table-cell <div>（§9.8 悬挂布局）", async () => {
    const result = await renderMarkdown(":::paragraph{.dropcap}\n首字后面的正文\n:::", {
      themeId: "default",
    });
    expect(result.html).toMatch(/<section style="[^"]*">首<\/section>/);
  });

  it("首字符装饰元素计算 font-size 换算值等于 2.2em", async () => {
    const result = await renderMarkdown(":::paragraph{.dropcap}\n首字后面的正文\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<section style="([^"]*)">首<\/section>/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toContain("font-size: 35.2px");
  });

  it("首字符装饰元素计算 display = table-cell（§9.8 悬挂布局）", async () => {
    const result = await renderMarkdown(":::paragraph{.dropcap}\n首字后面的正文\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<section style="([^"]*)">首<\/section>/);
    expect(match?.[1]).toContain("display: table-cell");
  });

  it("首字符装饰元素计算 vertical-align = top", async () => {
    const result = await renderMarkdown(":::paragraph{.dropcap}\n首字后面的正文\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<section style="([^"]*)">首<\/section>/);
    expect(match?.[1]).toContain("vertical-align: top");
  });

  it("首字符抽离后剩余文字保留在原位置", async () => {
    const result = await renderMarkdown(":::paragraph{.dropcap}\n首字后面的正文\n:::", {
      themeId: "default",
    });
    expect(result.html).toContain("字后面的正文");
  });
});

// AC-002: 任一主题渲染 dropcap，文字色 = 该主题 --color-brand；font-family 经平台过滤剥除
describe("AC-002: paragraph dropcap 变体主题色值与字体族", () => {
  it("首字符装饰元素色值计算值等于 default 主题 --color-brand（#2d5a4e）", async () => {
    const result = await renderMarkdown(":::paragraph{.dropcap}\n首字后面的正文\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<section style="([^"]*)">首<\/section>/);
    expect(match?.[1]).toContain("color: #2d5a4e");
  });

  it("首字符装饰元素不含 font-family 声明（output 相剥除，微信系统字体接管）", async () => {
    const result = await renderMarkdown(":::paragraph{.dropcap}\n首字后面的正文\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<section style="([^"]*)">首<\/section>/);
    expect(match?.[1]).not.toContain("font-family");
  });
});

// AC-003: 渲染产物不含 float 声明
describe("AC-003: paragraph dropcap 变体渲染产物不含 float 声明", () => {
  it("dropcap 渲染后 HTML 不含 float 声明", async () => {
    const result = await renderMarkdown(":::paragraph{.dropcap}\n首字后面的正文\n:::", {
      themeId: "default",
    });
    expect(result.html).not.toMatch(/float\s*:/);
  });
});

// AC-004: 未选定 dropcap（默认渲染）时段落渲染保持现状不变
describe("AC-004: paragraph 默认渲染不受 dropcap variant 影响（回归验证）", () => {
  it("普通段落（无 container directive）渲染为 <p> 标签，不含 dropcap slot", async () => {
    const result = await renderMarkdown("首字后面的正文", { themeId: "default" });
    expect(result.html).toMatch(/<p style="[^"]*">首字后面的正文<\/p>/);
    expect(result.html).not.toMatch(/data-block-slot="dropcap"/);
  });

  it("普通段落渲染不含独立首字符悬挂 <div>", async () => {
    const result = await renderMarkdown("首字后面的正文", { themeId: "default" });
    expect(result.html).not.toMatch(/<section style="[^"]*">首<\/section>/);
  });
});
