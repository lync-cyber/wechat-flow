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

// AC-001: announcement.variants 不再含 banner，改为 danger-bar
describe("AC-001: announcement variants 收敛，banner 改名为 danger-bar", () => {
  it("announcement.variants 的 id 集合不含 banner", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const def = describeBlock("announcement");
    const ids = (def?.variants ?? []).map((v) => v.id);
    expect(ids).not.toContain("banner");
  });

  it("announcement.variants 的 id 集合含 danger-bar", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const def = describeBlock("announcement");
    const ids = (def?.variants ?? []).map((v) => v.id);
    expect(ids).toContain("danger-bar");
  });
});

// AC-002: danger-bar 变体 — 顶部 accent 实条 + 左边框 + 浅底
describe("AC-002: danger-bar 变体解析含顶部 accent 实条与左边框", () => {
  it("getBlockBaseStyle('announcement','danger-bar') 的 border-top 为 4px solid 含 accent 色值", () => {
    const base = getBlockBaseStyle("announcement", "danger-bar");
    expect(base["border-top"]).toContain("4px solid");
    expect(base["border-top"]).toContain("#B94A3E");
  });

  it("getBlockBaseStyle('announcement','danger-bar') 的 border-left 为 3px solid 含 accent 色值", () => {
    const base = getBlockBaseStyle("announcement", "danger-bar");
    expect(base["border-left"]).toContain("3px solid");
    expect(base["border-left"]).toContain("#B94A3E");
  });

  it("getBlockBaseStyle('announcement','danger-bar') 的 background 为 surface-alt 色值", () => {
    const base = getBlockBaseStyle("announcement", "danger-bar");
    expect(base.background).toBe("#F3F0EB");
  });

  it("danger-bar 端到端渲染后容器 style 属性含关键声明", async () => {
    const result = await renderMarkdown(":::announcement{.danger-bar}\n重要通知内容\n:::", {
      themeId: "default",
    });
    const containerMatch = result.html.match(
      /<div data-block="announcement" data-variant="danger-bar" style="([^"]*)"/
    );
    expect(containerMatch).not.toBeNull();
    const styleAttr = containerMatch?.[1] ?? "";
    expect(styleAttr).toContain("border-top: 4px solid #B94A3E");
    expect(styleAttr).toContain("border-left: 3px solid #B94A3E");
    expect(styleAttr).toContain("background: #F3F0EB");
  });
});

// AC-003: compact 变体 — 紧凑单行，无顶部条，font-size 为主题 --font-size-sm 计算值
describe("AC-003: compact 变体解析为紧凑单行且无顶部条", () => {
  it("getBlockBaseStyle('announcement','compact') 的 padding 为 8px 12px", () => {
    const base = getBlockBaseStyle("announcement", "compact");
    expect(base.padding).toBe("8px 12px");
  });

  it("getBlockBaseStyle('announcement','compact') 的 border-left 为 3px solid 含 brand 色值", () => {
    const base = getBlockBaseStyle("announcement", "compact");
    expect(base["border-left"]).toContain("3px solid");
    expect(base["border-left"]).toContain("#2D5A4E");
  });

  it("getBlockBaseStyle('announcement','compact') 不含 border-top 声明", () => {
    const base = getBlockBaseStyle("announcement", "compact");
    expect(base["border-top"]).toBeUndefined();
  });

  it("getBlockBaseStyle('announcement','compact') 的 font-size 等于 default 主题 --font-size-sm 计算值", () => {
    const base = getBlockBaseStyle("announcement", "compact");
    expect(base["font-size"]).toBe("13px");
  });

  it("compact 端到端渲染后容器 style 不含 border-top 声明", async () => {
    const result = await renderMarkdown(":::announcement{.compact}\n提醒\n:::", {
      themeId: "default",
    });
    const containerMatch = result.html.match(
      /<div data-block="announcement" data-variant="compact" style="([^"]*)"/
    );
    expect(containerMatch).not.toBeNull();
    const styleAttr = containerMatch?.[1] ?? "";
    expect(styleAttr).not.toContain("border-top");
    expect(styleAttr).toContain("padding: 8px 12px");
  });
});

// AC-004: default 变体 — danger-bar 去掉顶部实条的简化版（仅左边框 + 浅底，无 border-top）
describe("AC-004: default 变体为 danger-bar 去掉顶部实条的简化版", () => {
  it("getBlockBaseStyle('announcement','default') 不含 border-top 声明", () => {
    const base = getBlockBaseStyle("announcement", "default");
    expect(base["border-top"]).toBeUndefined();
  });

  it("getBlockBaseStyle('announcement','default') 的 border-left 为 3px solid 含 accent 色值", () => {
    const base = getBlockBaseStyle("announcement", "default");
    expect(base["border-left"]).toContain("3px solid");
    expect(base["border-left"]).toContain("#B94A3E");
  });

  it("getBlockBaseStyle('announcement','default') 的 background 为 surface-alt 色值", () => {
    const base = getBlockBaseStyle("announcement", "default");
    expect(base.background).toBe("#F3F0EB");
  });

  it("default 端到端渲染后容器 style 不含 border-top 声明", async () => {
    const result = await renderMarkdown(":::announcement\n公告内容\n:::", {
      themeId: "default",
    });
    const containerMatch = result.html.match(
      /<div data-block="announcement" data-variant="default" style="([^"]*)"/
    );
    expect(containerMatch).not.toBeNull();
    const styleAttr = containerMatch?.[1] ?? "";
    expect(styleAttr).not.toContain("border-top");
    expect(styleAttr).toContain("border-left: 3px solid #B94A3E");
  });
});

// AC-005: 三变体渲染产物均不含 transform: rotate(...) 声明
describe("AC-005: announcement 变体不引入 transform:rotate 贴纸感旋转", () => {
  it.each(["danger-bar", "compact", "default"] as const)(
    "getBlockBaseStyle('announcement','%s') 不含 transform 声明",
    (variantId) => {
      const base = getBlockBaseStyle("announcement", variantId);
      expect(base.transform).toBeUndefined();
    }
  );

  it.each(["danger-bar", "compact"] as const)(
    "announcement{.%s} 渲染产物 style 属性不含 transform: rotate",
    async (variantId) => {
      const result = await renderMarkdown(`:::announcement{.${variantId}}\n内容\n:::`, {
        themeId: "default",
      });
      expect(result.html).not.toMatch(/transform:\s*rotate/);
    }
  );

  it("announcement (default) 渲染产物 style 属性不含 transform: rotate", async () => {
    const result = await renderMarkdown(":::announcement\n内容\n:::", {
      themeId: "default",
    });
    expect(result.html).not.toMatch(/transform:\s*rotate/);
  });
});
