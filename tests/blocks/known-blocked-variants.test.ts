import { describe, expect, it } from "vitest";
import { audio } from "../../packages/blocks/src/blocks/audio.ts";
import { video } from "../../packages/blocks/src/blocks/video.ts";
import { listAllVariants, registerTheme, renderMarkdown } from "../../packages/core/src/index.ts";
import "../../packages/blocks/src/index.ts";
import { KNOWN_BLOCKED_VARIANTS } from "../../packages/blocks/src/known-blocked-variants.ts";
import defaultTheme from "../../packages/themes/default/src/index.ts";
import { buildDirectiveMarkdown } from "./directive-markdown-fixtures.ts";

registerTheme(defaultTheme);

describe("T-207 AC-001: audio/video 具名变体从 variants 数组移除", () => {
  it("audio.variants 仅剩 default，不再含 mini/full", () => {
    expect(audio.variants.map((v) => v.id)).toEqual(["default"]);
  });

  it("video.variants 仅剩 default，不再含 with-caption/autoplay", () => {
    expect(video.variants.map((v) => v.id)).toEqual(["default"]);
  });
});

describe("T-207 AC-002: KNOWN_BLOCKED_VARIANTS 登记三项 blocked 变体", () => {
  it("含 audio::full / audio::mini / video::with-caption", () => {
    expect(KNOWN_BLOCKED_VARIANTS.has("audio::full")).toBe(true);
    expect(KNOWN_BLOCKED_VARIANTS.has("audio::mini")).toBe(true);
    expect(KNOWN_BLOCKED_VARIANTS.has("video::with-caption")).toBe(true);
    expect(KNOWN_BLOCKED_VARIANTS.size).toBe(3);
  });

  it("不含 video::autoplay（T-208 永久 DELETE，非 feasibility-blocked）", () => {
    expect(KNOWN_BLOCKED_VARIANTS.has("video::autoplay")).toBe(false);
  });
});

describe("T-207 AC-003: listAllVariants 与 default 渲染字节保真", () => {
  it("listAllVariants() 不再包含移除的 3 项", () => {
    const keys = new Set(listAllVariants().map((v) => `${v.blockId}::${v.id}`));
    expect(keys.has("audio::full")).toBe(false);
    expect(keys.has("audio::mini")).toBe(false);
    expect(keys.has("video::with-caption")).toBe(false);
  });

  it("listAllVariants() 仍保留 audio::default / video::default，不再含 video::autoplay（T-208 DELETE）", () => {
    const keys = new Set(listAllVariants().map((v) => `${v.blockId}::${v.id}`));
    expect(keys.has("audio::default")).toBe(true);
    expect(keys.has("video::default")).toBe(true);
    expect(keys.has("video::autoplay")).toBe(false);
  });

  it("audio default 渲染产物与移除前字节相同（golden 锁）", async () => {
    const result = await renderMarkdown(buildDirectiveMarkdown("audio", "default"), {
      themeId: "default",
    });
    expect(result.html).toBe(
      '<section data-block="audio" data-variant="default"><p style="color: #1c1917; font-size: 15px; font-weight: 400; line-height: 1.85; margin: 0 0 12px; text-align: left">这是用于微信粘贴安全校验的示例正文内容。</p></section>'
    );
  });

  it("video default 渲染产物与移除前字节相同（golden 锁）", async () => {
    const result = await renderMarkdown(buildDirectiveMarkdown("video", "default"), {
      themeId: "default",
    });
    expect(result.html).toBe(
      '<section data-block="video" data-variant="default"><p style="color: #1c1917; font-size: 15px; font-weight: 400; line-height: 1.85; margin: 0 0 12px; text-align: left">这是用于微信粘贴安全校验的示例正文内容。</p></section>'
    );
  });
});
