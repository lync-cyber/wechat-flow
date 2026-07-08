import { beforeEach, describe, expect, it } from "vitest";
import {
  describeBlock,
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

// AC-001: callout variants 数组收敛为恰好 4 项 tip/warning/info/danger
describe("AC-001: callout variants 收敛为 4 项", () => {
  it("callout.variants 长度恰好为 4", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const def = describeBlock("callout");
    expect(def?.variants.length).toBe(4);
  });

  it("callout.variants 的 id 集合恰为 {tip, warning, info, danger}", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const def = describeBlock("callout");
    const ids = (def?.variants ?? []).map((v) => v.id).sort();
    expect(ids).toEqual(["danger", "info", "tip", "warning"]);
  });

  it("旧变体 ID（default/filled/minimal/success/error/note/important）不再作为独立注册项", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const def = describeBlock("callout");
    const ids = (def?.variants ?? []).map((v) => v.id);
    for (const oldId of ["filled", "minimal", "success", "error", "note", "important"]) {
      expect(ids).not.toContain(oldId);
    }
  });
});

// AC-002: tip 变体 — 不对称圆角 + 右侧 inset 色条
describe("AC-002: tip 变体解析含不对称圆角与右侧 inset 色条", () => {
  it("getBlockBaseStyle('callout','tip') 含 border-radius: 8px 0 8px 8px", () => {
    const base = getBlockBaseStyle("callout", "tip");
    expect(base["border-radius"]).toBe("8px 0 8px 8px");
  });

  it("getBlockBaseStyle('callout','tip') 的 box-shadow 含 inset -4px 0 0 0", () => {
    const base = getBlockBaseStyle("callout", "tip");
    expect(base["box-shadow"]).toContain("inset -4px 0 0 0");
  });
});

// AC-003: warning 变体 — 顶部虚线 + 底部实线同色 + 透明背景
describe("AC-003: warning 变体解析含顶部虚线/底部实线同色/透明背景", () => {
  it("getBlockBaseStyle('callout','warning') 含 border-top: 2px dashed", () => {
    const base = getBlockBaseStyle("callout", "warning");
    expect(base["border-top"]).toContain("2px dashed");
  });

  it("getBlockBaseStyle('callout','warning') 含 border-bottom: 2px solid", () => {
    const base = getBlockBaseStyle("callout", "warning");
    expect(base["border-bottom"]).toContain("2px solid");
  });

  it("getBlockBaseStyle('callout','warning') 的 border-top 与 border-bottom 色值相同", () => {
    const base = getBlockBaseStyle("callout", "warning");
    const topColor = base["border-top"]?.replace("2px dashed", "").trim();
    const bottomColor = base["border-bottom"]?.replace("2px solid", "").trim();
    expect(topColor).toBe(bottomColor);
    expect(topColor?.length).toBeGreaterThan(0);
  });

  it("getBlockBaseStyle('callout','warning') 的 background 为 transparent", () => {
    const base = getBlockBaseStyle("callout", "warning");
    expect(base.background).toBe("transparent");
  });
});

// AC-004: info 变体 — 全边框 + 顶部 inset 高光
describe("AC-004: info 变体解析含全边框与顶部 inset 高光", () => {
  it("getBlockBaseStyle('callout','info') 含 border: 1px solid", () => {
    const base = getBlockBaseStyle("callout", "info");
    expect(base.border).toContain("1px solid");
  });

  it("getBlockBaseStyle('callout','info') 的 box-shadow 含 inset 0 2px 0 0 顶部高光声明", () => {
    const base = getBlockBaseStyle("callout", "info");
    expect(base["box-shadow"]).toContain("inset 0 2px 0 0");
  });
});

// AC-005: danger 变体 — 顶部 8px 实条 + 零圆角
describe("AC-005: danger 变体解析含顶部实条与零圆角", () => {
  it("getBlockBaseStyle('callout','danger') 含 border-top: 8px solid", () => {
    const base = getBlockBaseStyle("callout", "danger");
    expect(base["border-top"]).toContain("8px solid");
  });

  it("getBlockBaseStyle('callout','danger') 的 border-radius 为 0", () => {
    const base = getBlockBaseStyle("callout", "danger");
    expect(base["border-radius"]).toBe("0");
  });
});

// AC-006: 端到端渲染 — 四态 baseStyle 被 inlineStyle 合成进最终 HTML 的 style 属性
describe("AC-006: 四态 baseStyle 经 renderMarkdown 端到端合成进 style 属性", () => {
  it.each(["tip", "warning", "info", "danger"] as const)(
    "callout{.%s} 渲染后容器 style 属性含该变体的关键声明",
    async (variantId) => {
      const result = await renderMarkdown(`:::callout{.${variantId}}\ncontent\n:::`, {
        themeId: "default",
      });
      expect(result.html).toMatch(new RegExp(`data-variant="${variantId}"`));
      const containerMatch = result.html.match(
        new RegExp(`<section data-block="callout" data-variant="${variantId}" style="([^"]*)"`)
      );
      expect(containerMatch).not.toBeNull();
      const styleAttr = containerMatch?.[1] ?? "";
      expect(styleAttr.length).toBeGreaterThan(0);

      const base = getBlockBaseStyle("callout", variantId);
      for (const [prop] of Object.entries(base)) {
        expect(styleAttr).toContain(prop);
      }
    }
  );

  it("四态渲染的 style 属性互不相同（真实视觉差异体现在合成 HTML）", async () => {
    const htmls = await Promise.all(
      (["tip", "warning", "info", "danger"] as const).map((variantId) =>
        renderMarkdown(`:::callout{.${variantId}}\ncontent\n:::`, { themeId: "default" })
      )
    );
    const styles = htmls.map((r) => {
      const m = r.html.match(/<section data-block="callout"[^>]*style="([^"]*)"/);
      return m?.[1] ?? "";
    });
    const uniqueStyles = new Set(styles);
    expect(uniqueStyles.size).toBe(4);
  });
});
