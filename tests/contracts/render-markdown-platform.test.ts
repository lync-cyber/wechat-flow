import { describe, expect, it } from "vitest";
import { renderMarkdownRequestSchema } from "../../packages/contracts/src/index.ts";
import { renderMarkdown } from "../../packages/core/src/index.ts";
import type { RenderOptions } from "../../packages/core/src/types.ts";

function withPlatform(platform: string): RenderOptions {
  return { platform } as unknown as RenderOptions;
}

describe("AC-005: renderMarkdownRequestSchema 新增可选 platform 字段", () => {
  it("含 platform: 'wechat' 的请求体校验通过，且解析结果保留 platform 值（非静默丢弃未声明字段）", () => {
    const parsed = renderMarkdownRequestSchema.safeParse({
      markdown: "# hi",
      platform: "wechat",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect((parsed.data as Record<string, unknown>).platform).toBe("wechat");
    }
  });

  it("省略 platform 字段的请求体仍校验通过（可选字段，不强制传入）", () => {
    const parsed = renderMarkdownRequestSchema.safeParse({ markdown: "# hi" });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect((parsed.data as Record<string, unknown>).platform).toBeUndefined();
    }
  });
});

describe("AC-005: renderMarkdown 对未注册 platform 返回结构化 E_UNSUPPORTED_PLATFORM 错误", () => {
  it("platform: 'xhs'（未注册平台）时返回含 code: 'E_UNSUPPORTED_PLATFORM' 的结构化响应，不静默回退到 wechat 渲染", async () => {
    const result = await renderMarkdown("# hi", withPlatform("xhs"));

    expect((result as unknown as { code?: string }).code).toBe("E_UNSUPPORTED_PLATFORM");
  });

  it("platform: 'xhs' 时响应不含 html 字段（证明未静默回退到正常渲染路径）", async () => {
    const result = await renderMarkdown("# hi", withPlatform("xhs"));

    expect((result as unknown as { html?: string }).html).toBeUndefined();
  });

  it("platform: 'wechat'（已注册平台）时正常渲染，响应无 code 字段且含预期标题标签", async () => {
    const result = await renderMarkdown("# Hello\n\nWorld", withPlatform("wechat"));

    expect((result as unknown as { code?: string }).code).toBeUndefined();
    expect(result.html).toMatch(/<h1[^>]*>/);
  });

  it("省略 platform 参数时渲染结果与显式传入 'wechat' 完全一致（默认平台语义为 wechat）", async () => {
    const withDefault = await renderMarkdown("# Hello\n\nWorld");
    const withExplicitWechat = await renderMarkdown("# Hello\n\nWorld", withPlatform("wechat"));

    expect(withDefault.html).toBe(withExplicitWechat.html);
    expect((withDefault as unknown as { code?: string }).code).toBeUndefined();
  });
});
