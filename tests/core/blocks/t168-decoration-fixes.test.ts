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

describe("T-168 AC-001: 装饰引号 span 为首个 <p> 的第一个子节点（与正文同行，非兄弟节点）", () => {
  it("quote large-quote-mark: 引号 span 与正文同处一个 <p>，span 为其第一个子节点", async () => {
    const result = await renderMarkdown(":::quote{.large-quote-mark}\n引用文字\n:::", {
      themeId: "default",
    });
    expect(result.html).toMatch(/<p style="[^"]*"><span style="[^"]*">"<\/span>引用文字<\/p>/);
  });

  it("pull-quote decorated: 引号 span 与正文同处一个 <p>，span 为其第一个子节点", async () => {
    const result = await renderMarkdown(':::pull-quote{.decorated author="鲁迅"}\n摘引文字\n:::', {
      themeId: "default",
    });
    expect(result.html).toMatch(/<p style="[^"]*"><span style="[^"]*">「<\/span>摘引文字<\/p>/);
  });
});

describe("T-168 AC-002: large-quote-mark/dropcap root 为无边框引用基线", () => {
  it("getBlockBaseStyle('quote','large-quote-mark') 不含 border-left，保留 padding/margin/color 基线", () => {
    const base = getBlockBaseStyle("quote", "large-quote-mark");
    expect(base["border-left"]).toBeUndefined();
    expect(base.padding).toBe("8px 16px");
    expect(base.margin).toBe("16px 0");
    expect(base.color).toBe("#555");
  });

  it("getBlockBaseStyle('quote','dropcap') 不含 border-left，保留 padding/margin/color 基线", () => {
    const base = getBlockBaseStyle("quote", "dropcap");
    expect(base["border-left"]).toBeUndefined();
    expect(base.padding).toBe("8px 16px");
    expect(base.margin).toBe("16px 0");
    expect(base.color).toBe("#555");
  });

  it("large-quote-mark 渲染后容器 div style 不含 border-left", async () => {
    const result = await renderMarkdown(":::quote{.large-quote-mark}\n引用文字\n:::", {
      themeId: "default",
    });
    const containerMatch = result.html.match(
      /<section data-block="quote" data-variant="large-quote-mark" style="([^"]*)"/
    );
    expect(containerMatch).not.toBeNull();
    expect(containerMatch?.[1]).not.toContain("border-left");
  });

  it("dropcap 渲染后容器 div style 不含 border-left", async () => {
    const result = await renderMarkdown(":::quote{.dropcap}\n引用文字\n:::", {
      themeId: "default",
    });
    const containerMatch = result.html.match(
      /<section data-block="quote" data-variant="dropcap" style="([^"]*)"/
    );
    expect(containerMatch).not.toBeNull();
    expect(containerMatch?.[1]).not.toContain("border-left");
  });
});

describe("T-168 AC-003: dropcap 装饰元素 line-height = 1（paragraph 与 quote 两处）", () => {
  it("quote dropcap 首字符装饰元素 line-height = 1", async () => {
    const result = await renderMarkdown(":::quote{.dropcap}\n引用文字\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<section style="([^"]*)">引<\/section>/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toContain("line-height: 1");
  });

  it("paragraph dropcap 首字符装饰元素 line-height = 1", async () => {
    const result = await renderMarkdown(":::paragraph{.dropcap}\n首字后面的正文\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<section style="([^"]*)">首<\/section>/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toContain("line-height: 1");
  });
});

describe("T-168 AC-004: pull-quote decorated 署名行渲染文本为「—— {author}」", () => {
  it("署名行文本为 —— 鲁迅（破折号前缀 + 空格）", async () => {
    const result = await renderMarkdown(':::pull-quote{.decorated author="鲁迅"}\n摘引文字\n:::', {
      themeId: "default",
    });
    expect(result.html).toMatch(/<section style="[^"]*">—— 鲁迅<\/section>/);
  });
});

describe("T-168 AC-005: §9.8 display:table 双格悬挂结构 — paragraph{.dropcap} 与 quote{.dropcap} 一致", () => {
  it("paragraph dropcap 外层为 display:table + width:100%，紧邻首字 cell", async () => {
    const result = await renderMarkdown(":::paragraph{.dropcap}\n首字后面的正文\n:::", {
      themeId: "default",
    });
    const wrapMatch = result.html.match(
      /<section style="([^"]*)"><section style="[^"]*">首<\/section>/
    );
    expect(wrapMatch).not.toBeNull();
    expect(wrapMatch?.[1]).toContain("display: table");
    expect(wrapMatch?.[1]).toContain("width: 100%");
  });

  it("paragraph dropcap 左 cell（首字）具备 table-cell 悬挂布局全部声明", async () => {
    const result = await renderMarkdown(":::paragraph{.dropcap}\n首字后面的正文\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<section style="([^"]*)">首<\/section>/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toContain("display: table-cell");
    expect(match?.[1]).toContain("width: 1%");
    expect(match?.[1]).toContain("white-space: nowrap");
    expect(match?.[1]).toContain("vertical-align: top");
    expect(match?.[1]).toContain("padding-right: 8px");
  });

  it("paragraph dropcap 右 cell（正文）为 <p> 标签，含 display:table-cell + vertical-align:top，正文悬挂保留", async () => {
    const result = await renderMarkdown(":::paragraph{.dropcap}\n首字后面的正文\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<p style="([^"]*)">字后面的正文<\/p>/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toContain("display: table-cell");
    expect(match?.[1]).toContain("vertical-align: top");
  });

  it("quote dropcap 外层为 display:table + width:100%，紧邻首字 cell", async () => {
    const result = await renderMarkdown(":::quote{.dropcap}\n引用文字\n:::", {
      themeId: "default",
    });
    const wrapMatch = result.html.match(
      /<section style="([^"]*)"><section style="[^"]*">引<\/section>/
    );
    expect(wrapMatch).not.toBeNull();
    expect(wrapMatch?.[1]).toContain("display: table");
    expect(wrapMatch?.[1]).toContain("width: 100%");
  });

  it("quote dropcap 左 cell（首字）具备 table-cell 悬挂布局全部声明", async () => {
    const result = await renderMarkdown(":::quote{.dropcap}\n引用文字\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<section style="([^"]*)">引<\/section>/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toContain("display: table-cell");
    expect(match?.[1]).toContain("width: 1%");
    expect(match?.[1]).toContain("white-space: nowrap");
    expect(match?.[1]).toContain("vertical-align: top");
    expect(match?.[1]).toContain("padding-right: 8px");
  });

  it("quote dropcap 右 cell（正文）为 <p> 标签，含 display:table-cell + vertical-align:top，容器 color 下推同时生效", async () => {
    const result = await renderMarkdown(":::quote{.dropcap}\n引用文字\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<p style="([^"]*)">用文字<\/p>/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toContain("display: table-cell");
    expect(match?.[1]).toContain("vertical-align: top");
    expect(match?.[1]).toContain("color: #555");
  });
});
