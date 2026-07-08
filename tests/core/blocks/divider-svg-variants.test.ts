import { beforeEach, describe, expect, it } from "vitest";
import {
  renderMarkdown,
  resetBlockRegistry,
  resetVariantRegistry,
} from "../../../packages/core/src/index.ts";
import "../../../packages/blocks/src/index.ts";
import "../../../packages/themes/default/src/index.ts";

const DEFAULT_COLOR_BORDER = "#D6D3CE";
const DEFAULT_COLOR_BORDER_STRONG = "#A8A29E";
const DEFAULT_COLOR_BRAND = "#2D5A4E";

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
});

async function renderDivider(variantId: string): Promise<string> {
  const result = await renderMarkdown(`:::divider{.${variantId}}\n:::`, {
    themeId: "default",
  });
  return result.html;
}

function extractDividerContainer(html: string): string | null {
  const match = html.match(/<section data-block="divider"[^>]*>[\s\S]*?<\/section>/);
  return match ? match[0] : null;
}

describe("AC-001: wave 变体渲染正弦波 SVG 且 stroke 取主题 --color-border 实际值", () => {
  it("输出 HTML 含 wave 变体的 viewBox 与 path 元素", async () => {
    const html = await renderDivider("wave");
    expect(html).toContain('<svg viewBox="0 0 240 20"');
    expect(html).toContain('<path d="M0,10 C40,2 80,18 120,10 C160,2 200,18 240,10"');
  });

  it("wave path 的 stroke 属性值等于 default 主题 --color-border 实际计算值 #D6D3CE", async () => {
    const html = await renderDivider("wave");
    const container = extractDividerContainer(html);
    expect(container).not.toBeNull();
    const pathMatch = container?.match(/<path[^>]*d="M0,10 C40,2[^"]*"[^>]*>/);
    expect(pathMatch).not.toBeNull();
    const pathTag = pathMatch?.[0] ?? "";
    const strokeMatch = pathTag.match(/stroke="([^"]*)"/);
    expect(strokeMatch?.[1]).toBe(DEFAULT_COLOR_BORDER);
  });
});

describe("AC-002: dots 变体渲染三圆点 SVG 且 fill 取主题 --color-border-strong 实际值", () => {
  it("输出 HTML 含 dots 变体的 viewBox 与 3 个 r=2 的 circle 元素", async () => {
    const html = await renderDivider("dots");
    expect(html).toContain('<svg viewBox="0 0 60 10"');
    const circleMatches = html.match(/<circle[^>]*r="2"[^>]*>/g) ?? [];
    expect(circleMatches.length).toBe(3);
  });

  it("dots 三个 circle 的 cx 分别为 20/30/40，cy 均为 5", async () => {
    const html = await renderDivider("dots");
    const circleMatches = html.match(/<circle[^>]*>/g) ?? [];
    expect(circleMatches.length).toBe(3);
    const cxValues = circleMatches.map((tag) => tag.match(/cx="([^"]*)"/)?.[1]).sort();
    expect(cxValues).toEqual(["20", "30", "40"]);
    for (const tag of circleMatches) {
      expect(tag.match(/cy="([^"]*)"/)?.[1]).toBe("5");
    }
  });

  it("dots circle 的 fill 属性值等于 default 主题 --color-border-strong 实际计算值 #A8A29E", async () => {
    const html = await renderDivider("dots");
    const container = extractDividerContainer(html);
    expect(container).not.toBeNull();
    const circleMatches = container?.match(/<circle[^>]*>/g) ?? [];
    expect(circleMatches.length).toBe(3);
    for (const tag of circleMatches) {
      expect(tag.match(/fill="([^"]*)"/)?.[1]).toBe(DEFAULT_COLOR_BORDER_STRONG);
    }
  });
});

describe("AC-003: flower 变体渲染两线夹花瓣 SVG 且 stroke/fill 分别取 --color-border/--color-brand", () => {
  it("输出 HTML 含 2 个 line 元素与 1 个花瓣（path 或菱形）元素", async () => {
    const html = await renderDivider("flower");
    const container = extractDividerContainer(html);
    expect(container).not.toBeNull();
    expect(container).toContain("<svg");
    const lineMatches = container?.match(/<line[^>]*>/g) ?? [];
    expect(lineMatches.length).toBe(2);
    const petalMatches = container?.match(/<(path|polygon)[^>]*>/g) ?? [];
    expect(petalMatches.length).toBe(1);
  });

  it("flower 的两条 line 的 stroke 属性值等于 default 主题 --color-border 实际计算值 #D6D3CE", async () => {
    const html = await renderDivider("flower");
    const container = extractDividerContainer(html);
    const lineMatches = container?.match(/<line[^>]*>/g) ?? [];
    expect(lineMatches.length).toBe(2);
    for (const tag of lineMatches) {
      expect(tag.match(/stroke="([^"]*)"/)?.[1]).toBe(DEFAULT_COLOR_BORDER);
    }
  });

  it("flower 的花瓣元素 fill 属性值等于 default 主题 --color-brand 实际计算值 #2D5A4E", async () => {
    const html = await renderDivider("flower");
    const container = extractDividerContainer(html);
    const petalMatches = container?.match(/<(path|polygon)[^>]*>/g) ?? [];
    expect(petalMatches.length).toBe(1);
    const petalTag = petalMatches?.[0] ?? "";
    expect(petalTag.match(/fill="([^"]*)"/)?.[1]).toBe(DEFAULT_COLOR_BRAND);
  });
});

describe("AC-004: sanitize 阶段放行 divider SVG 标签与属性", () => {
  it.each(["wave", "dots", "flower"] as const)(
    "%s 变体经完整渲染管线（含 sanitizeHast）后 svg/path/circle/line 标签未被剥离",
    async (variantId) => {
      const html = await renderDivider(variantId);
      const container = extractDividerContainer(html);
      expect(container).not.toBeNull();
      expect(container).toContain("<svg");
    }
  );

  it("wave 输出保留 viewBox/stroke/d/stroke-width 属性未被 sanitize 剥离", async () => {
    const html = await renderDivider("wave");
    const container = extractDividerContainer(html) ?? "";
    expect(container).toMatch(/viewBox="0 0 240 20"/);
    expect(container).toMatch(/stroke="#D6D3CE"/);
    expect(container).toMatch(/d="M0,10 C40,2 80,18 120,10 C160,2 200,18 240,10"/);
    expect(container).toMatch(/stroke-width="1\.5"/);
  });

  it("dots 输出保留 viewBox/fill/cx/cy/r 属性未被 sanitize 剥离", async () => {
    const html = await renderDivider("dots");
    const container = extractDividerContainer(html) ?? "";
    expect(container).toMatch(/viewBox="0 0 60 10"/);
    expect(container).toMatch(/fill="#A8A29E"/);
    expect(container).toMatch(/cx="20"/);
    expect(container).toMatch(/cy="5"/);
    expect(container).toMatch(/r="2"/);
  });
});

describe("AC-006: 三变体 <svg> 外层计算样式 display=block 且 margin 符合规格", () => {
  function extractSvgStyle(html: string): string {
    const container = extractDividerContainer(html) ?? "";
    const svgMatch = container.match(/<svg[^>]*style="([^"]*)"[^>]*>/);
    return svgMatch?.[1] ?? "";
  }

  it("wave 变体 <svg> 计算样式精确等于 display: block; margin: 24px auto", async () => {
    const html = await renderDivider("wave");
    const style = extractSvgStyle(html);
    expect(style).toBe("display: block; margin: 24px auto");
  });

  it("dots 变体 <svg> 计算样式精确等于 display: block; margin: 20px auto", async () => {
    const html = await renderDivider("dots");
    const style = extractSvgStyle(html);
    expect(style).toBe("display: block; margin: 20px auto");
  });

  it("flower 变体 <svg> 计算样式精确等于 display: block; margin: 24px auto", async () => {
    const html = await renderDivider("flower");
    const style = extractSvgStyle(html);
    expect(style).toBe("display: block; margin: 24px auto");
  });
});

describe("R-002: 非 SVG 变体不受 divider-decoration stage 影响", () => {
  it.each(["default", "thick"] as const)("%s 变体渲染结果不含 <svg> 标签", async (variantId) => {
    const html = await renderDivider(variantId);
    const container = extractDividerContainer(html);
    expect(container).not.toBeNull();
    expect(container).not.toContain("<svg");
  });
});

describe("R-002: 无主题时 SVG 变体使用硬编码 fallback 色值", () => {
  async function renderDividerWithoutTheme(variantId: string): Promise<string> {
    const result = await renderMarkdown(`:::divider{.${variantId}}\n:::`);
    return result.html;
  }

  it("省略 themeId 渲染 wave 变体，path stroke 等于 fallback --color-border #D6D3CE", async () => {
    const html = await renderDividerWithoutTheme("wave");
    const container = extractDividerContainer(html) ?? "";
    const pathMatch = container.match(/<path[^>]*d="M0,10 C40,2[^"]*"[^>]*>/);
    expect(pathMatch).not.toBeNull();
    const strokeMatch = pathMatch?.[0].match(/stroke="([^"]*)"/);
    expect(strokeMatch?.[1]).toBe(DEFAULT_COLOR_BORDER);
  });

  it("省略 themeId 渲染 dots 变体，circle fill 等于 fallback --color-border-strong #A8A29E", async () => {
    const html = await renderDividerWithoutTheme("dots");
    const container = extractDividerContainer(html) ?? "";
    const circleMatches = container.match(/<circle[^>]*>/g) ?? [];
    expect(circleMatches.length).toBe(3);
    for (const tag of circleMatches) {
      expect(tag.match(/fill="([^"]*)"/)?.[1]).toBe(DEFAULT_COLOR_BORDER_STRONG);
    }
  });

  it("省略 themeId 渲染 flower 变体，花瓣 fill 等于 fallback --color-brand #2D5A4E", async () => {
    const html = await renderDividerWithoutTheme("flower");
    const container = extractDividerContainer(html) ?? "";
    const petalMatches = container.match(/<(path|polygon)[^>]*>/g) ?? [];
    expect(petalMatches.length).toBe(1);
    const petalTag = petalMatches[0] ?? "";
    expect(petalTag.match(/fill="([^"]*)"/)?.[1]).toBe(DEFAULT_COLOR_BRAND);
  });
});
