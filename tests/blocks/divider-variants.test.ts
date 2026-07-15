import { beforeAll, describe, expect, it } from "vitest";
import { registerTheme, renderMarkdown } from "../../packages/core/src/index.ts";
import { runVariantDiffGuard } from "../../packages/core/src/registry/variant-diff-guard.ts";
import "../../packages/blocks/src/index.ts";
import defaultTheme from "../../packages/themes/default/src/index.ts";
import { buildDirectiveMarkdown } from "./directive-markdown-fixtures.ts";

beforeAll(() => {
  registerTheme(defaultTheme);
});

function buildDividerMarkdown(variantId: string): string {
  return `:::divider{.${variantId}}\n:::`;
}

function parseStyleDict(style: string | undefined): Record<string, string> {
  const dict: Record<string, string> = {};
  if (typeof style !== "string") return dict;
  for (const decl of style.split(";")) {
    const trimmed = decl.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    dict[trimmed.slice(0, idx).trim().toLowerCase()] = trimmed.slice(idx + 1).trim();
  }
  return dict;
}

async function renderDividerRootStyle(variantId: string): Promise<Record<string, string>> {
  const { html } = await renderMarkdown(buildDividerMarkdown(variantId), { themeId: "default" });
  const match = html.match(/<section data-block="divider"[^>]*style="([^"]*)"/);
  return parseStyleDict(match?.[1]);
}

function borderWidthPx(style: Record<string, string>): number {
  const match = style["border-width"]?.match(/^([\d.]+)px$/);
  return match ? Number.parseFloat(match[1]) : 0;
}

describe("AC-001: divider.thick root border-width 大于 default", () => {
  it("thick 的 border-width 数值大于 default（default 未声明 border-width，基准为 0）", async () => {
    const defaultStyle = await renderDividerRootStyle("default");
    const thickStyle = await renderDividerRootStyle("thick");
    expect(borderWidthPx(defaultStyle)).toBe(0);
    expect(borderWidthPx(thickStyle)).toBeGreaterThan(borderWidthPx(defaultStyle));
  });

  it("thick root 携带非 none 的 border-style 声明", async () => {
    const style = await renderDividerRootStyle("thick");
    expect(style["border-style"]).toBeTruthy();
    expect(style["border-style"]).not.toBe("none");
  });
});

describe("AC-002: divider.dotted root border-style: dotted", () => {
  it("dotted root border-style 精确等于 dotted", async () => {
    const style = await renderDividerRootStyle("dotted");
    expect(style["border-style"]).toBe("dotted");
  });

  it("dotted root border-color 引用主题 token 解析值而非硬编码", async () => {
    const style = await renderDividerRootStyle("dotted");
    expect(style["border-color"]).toBe("#d6d3ce");
  });
});

describe("AC-003: divider.dashed root border-style: dashed", () => {
  it("dashed root border-style 精确等于 dashed", async () => {
    const style = await renderDividerRootStyle("dashed");
    expect(style["border-style"]).toBe("dashed");
  });
});

describe("AC-004: 3 变体满足谓词①（差分守卫不判定为 finding）", () => {
  it("runVariantDiffGuard 不将 divider.thick/dotted/dashed 判定为渲染同 default 的 finding", async () => {
    const findings = await runVariantDiffGuard({
      buildMarkdown: buildDirectiveMarkdown,
      themeId: "default",
    });
    const findingKeys = new Set(findings.map((f) => `${f.blockId}::${f.variantId}`));
    for (const variantId of ["thick", "dotted", "dashed"]) {
      expect(findingKeys.has(`divider::${variantId}`)).toBe(false);
    }
  });

  it("每项新变体具备自身 root baseStyle delta（诚实实现，不依赖 decorate 兜底豁免）", async () => {
    const { describeBlock } = await import("../../packages/core/src/index.ts");
    const def = describeBlock("divider");
    for (const variantId of ["thick", "dotted", "dashed"]) {
      const variant = def?.variants.find((v) => v.id === variantId);
      const hasOwnDelta = Boolean(
        variant?.baseStyle &&
          Object.values(variant.baseStyle).some((slot) => Object.keys(slot).length > 0)
      );
      expect(hasOwnDelta).toBe(true);
    }
  });
});

describe("回归: divider default 与既有 SVG 装饰变体渲染不受影响", () => {
  it("default root 保持无 style 属性（现状基线不变）", async () => {
    const { html } = await renderMarkdown(buildDividerMarkdown("default"), {
      themeId: "default",
    });
    expect(html).toContain('<section data-block="divider" data-variant="default"></section>');
  });

  it("wave 变体渲染仍含 <svg>（不受本次新增 CSS 变体影响）", async () => {
    const { html } = await renderMarkdown(buildDividerMarkdown("wave"), { themeId: "default" });
    expect(html).toContain("<svg");
  });

  it.each(["thick", "dotted", "dashed"] as const)(
    "%s 变体渲染结果不含 <svg> 标签（纯 CSS border 实现，非装饰资产）",
    async (variantId) => {
      const { html } = await renderMarkdown(buildDividerMarkdown(variantId), {
        themeId: "default",
      });
      expect(html).not.toContain("<svg");
    }
  );
});
