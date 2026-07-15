import { beforeAll, describe, expect, it } from "vitest";
import { advertCard } from "../../packages/blocks/src/blocks/advert-card.ts";
import { card } from "../../packages/blocks/src/blocks/card.ts";
import { imageCaption } from "../../packages/blocks/src/blocks/image-caption.ts";
import { publicationSkeleton } from "../../packages/blocks/src/blocks/publication-skeleton.ts";
import { qrcode } from "../../packages/blocks/src/blocks/qrcode.ts";
import { quote } from "../../packages/blocks/src/blocks/quote.ts";
import { readingTime } from "../../packages/blocks/src/blocks/reading-time.ts";
import { subscribeCta } from "../../packages/blocks/src/blocks/subscribe-cta.ts";
import { listAllVariants, registerTheme, renderMarkdown } from "../../packages/core/src/index.ts";
import "../../packages/blocks/src/index.ts";
import defaultTheme from "../../packages/themes/default/src/index.ts";

beforeAll(() => {
  registerTheme(defaultTheme);
});

describe("T-208 AC-001/002: 9 项 DELETE 裁定从各块 variants 数组移除注册", () => {
  it("quote.variants 不含 large，保留其余全部项", () => {
    const ids = quote.variants.map((v) => v.id);
    expect(ids).not.toContain("large");
    expect(ids).toEqual([
      "default",
      "bordered",
      "centered",
      "filled",
      "minimal",
      "italic",
      "card",
      "large-quote-mark",
      "dropcap",
    ]);
  });

  it("card.variants 不含 horizontal，保留 default/elevated/outlined/minimal", () => {
    const ids = card.variants.map((v) => v.id);
    expect(ids).not.toContain("horizontal");
    expect(ids).toEqual(["default", "elevated", "outlined", "minimal"]);
  });

  it("publication-skeleton.variants 不含 magazine/minimal，仅剩 default", () => {
    const ids = publicationSkeleton.variants.map((v) => v.id);
    expect(ids).not.toContain("magazine");
    expect(ids).not.toContain("minimal");
    expect(ids).toEqual(["default"]);
  });

  it("reading-time.variants 不含 badge，保留 default/inline", () => {
    const ids = readingTime.variants.map((v) => v.id);
    expect(ids).not.toContain("badge");
    expect(ids).toEqual(["default", "inline"]);
  });

  it("advert-card.variants 不含 horizontal，保留 default/minimal", () => {
    const ids = advertCard.variants.map((v) => v.id);
    expect(ids).not.toContain("horizontal");
    expect(ids).toEqual(["default", "minimal"]);
  });

  it("subscribe-cta.variants 不含 centered，保留 default/banner", () => {
    const ids = subscribeCta.variants.map((v) => v.id);
    expect(ids).not.toContain("centered");
    expect(ids).toEqual(["default", "banner"]);
  });

  it("image-caption.variants 不含 overlay，保留 default/side", () => {
    const ids = imageCaption.variants.map((v) => v.id);
    expect(ids).not.toContain("overlay");
    expect(ids).toEqual(["default", "side"]);
  });

  it("qrcode.variants 不含 with-logo，保留 default/card", () => {
    const ids = qrcode.variants.map((v) => v.id);
    expect(ids).not.toContain("with-logo");
    expect(ids).toEqual(["default", "card"]);
  });
});

describe("T-208 AC-003: listAllVariants() 不再包含 9 项移除的变体", () => {
  it("9 项均不在 listAllVariants() 中", () => {
    const keys = new Set(listAllVariants().map((v) => `${v.blockId}::${v.id}`));
    expect(keys.has("quote::large")).toBe(false);
    expect(keys.has("card::horizontal")).toBe(false);
    expect(keys.has("publication-skeleton::magazine")).toBe(false);
    expect(keys.has("publication-skeleton::minimal")).toBe(false);
    expect(keys.has("reading-time::badge")).toBe(false);
    expect(keys.has("advert-card::horizontal")).toBe(false);
    expect(keys.has("subscribe-cta::centered")).toBe(false);
    expect(keys.has("image-caption::overlay")).toBe(false);
    expect(keys.has("qrcode::with-logo")).toBe(false);
  });

  it("各块其余变体仍在 listAllVariants() 中", () => {
    const keys = new Set(listAllVariants().map((v) => `${v.blockId}::${v.id}`));
    expect(keys.has("quote::default")).toBe(true);
    expect(keys.has("card::minimal")).toBe(true);
    expect(keys.has("publication-skeleton::default")).toBe(true);
    expect(keys.has("reading-time::default")).toBe(true);
    expect(keys.has("advert-card::minimal")).toBe(true);
    expect(keys.has("subscribe-cta::banner")).toBe(true);
    expect(keys.has("image-caption::side")).toBe(true);
    expect(keys.has("qrcode::card")).toBe(true);
  });
});

describe("T-208 AC-003: 各块保留变体渲染产物字节保真（golden 锁）", () => {
  it("quote.default 渲染字节不受影响", async () => {
    const result = await renderMarkdown(
      ":::quote{.default}\n这是用于微信粘贴安全校验的示例正文内容。\n:::",
      { themeId: "default" }
    );
    expect(result.html).toBe(
      '<section data-block="quote" data-variant="default" style="border-left: 3px solid #888; color: #555; margin: 16px 0; padding: 8px 16px"><p style="color: #555; font-size: 15px; font-weight: 400; line-height: 1.85; margin: 0 0 12px; text-align: left">这是用于微信粘贴安全校验的示例正文内容。</p></section>'
    );
  });

  it("card.minimal 渲染字节不受影响", async () => {
    const result = await renderMarkdown(
      ":::card{.minimal}\n这是用于微信粘贴安全校验的示例正文内容。\n:::",
      { themeId: "default" }
    );
    expect(result.html).toBe(
      '<section data-block="card" data-variant="minimal" style="border: none; border-radius: 0; margin: 12px 0; padding: 16px"><p style="color: #1c1917; font-size: 15px; font-weight: 400; line-height: 1.85; margin: 0 0 12px; text-align: left">这是用于微信粘贴安全校验的示例正文内容。</p></section>'
    );
  });

  it("publication-skeleton.default 渲染字节不受影响", async () => {
    const result = await renderMarkdown(
      ":::publication-skeleton{.default}\n这是用于微信粘贴安全校验的示例正文内容。\n:::",
      { themeId: "default" }
    );
    expect(result.html).toBe(
      '<section data-block="publication-skeleton" data-variant="default" style="line-height: 1.8; margin: 0 auto; max-width: 680px; padding: 24px 16px"><p style="color: #1c1917; font-size: 15px; font-weight: 400; line-height: 1.8; margin: 0 0 12px; text-align: left">这是用于微信粘贴安全校验的示例正文内容。</p></section>'
    );
  });

  it("reading-time.default 渲染字节不受影响", async () => {
    const result = await renderMarkdown(
      ":::reading-time{.default}\n这是用于微信粘贴安全校验的示例正文内容。\n:::",
      { themeId: "default" }
    );
    expect(result.html).toBe(
      '<section data-block="reading-time" data-variant="default" style="background-color: #f0f0f0; border-radius: 12px; color: #666; display: inline-block; font-size: 12.8px; margin: 8px 0; padding: 4px 10px"><p style="color: #666; font-size: 12.8px; font-weight: 400; line-height: 1.85; margin: 0 0 12px; text-align: left">这是用于微信粘贴安全校验的示例正文内容。</p></section>'
    );
  });

  it("advert-card.minimal 渲染字节不受影响", async () => {
    const result = await renderMarkdown(
      ":::advert-card{.minimal}\n这是用于微信粘贴安全校验的示例正文内容。\n:::",
      { themeId: "default" }
    );
    expect(result.html).toBe(
      '<section data-block="advert-card" data-variant="minimal" style="background-color: transparent; border: none; border-radius: 8px; margin: 16px 0; padding: 16px"><p style="color: #1c1917; font-size: 15px; font-weight: 400; line-height: 1.85; margin: 0 0 12px; text-align: left">这是用于微信粘贴安全校验的示例正文内容。</p></section>'
    );
  });

  it("subscribe-cta.banner 渲染字节不受影响", async () => {
    const result = await renderMarkdown(
      ":::subscribe-cta{.banner}\n这是用于微信粘贴安全校验的示例正文内容。\n:::",
      { themeId: "default" }
    );
    expect(result.html).toBe(
      '<section data-block="subscribe-cta" data-variant="banner" style="background-color: #f3f0eb; border: none; border-radius: 8px; margin: 24px 0; padding: 28px 16px; text-align: center"><p style="color: #1c1917; font-size: 18px; font-weight: 700; line-height: 1.85; margin-bottom: 12px; text-align: center">这是用于微信粘贴安全校验的示例正文内容。</p><section style="background: #2d5a4e; border-radius: 24px; color: #fafaf9; display: inline-block; font-size: 15px; font-weight: 700; line-height: 1.85; padding: 8px 24px; text-align: center">订阅更新</section></section>'
    );
  });

  it("image-caption.side 渲染字节不受影响", async () => {
    const result = await renderMarkdown(
      ":::image-caption{.side}\n![示例图片](https://example.com/a.png)\n\n带说明文字\n:::",
      { themeId: "default" }
    );
    expect(result.html).toBe(
      '<section data-block="image-caption" data-variant="side" style="display: table; table-layout: fixed; width: 100%"><section style="color: #1c1917; display: table-cell; font-size: 15px; line-height: 1.85; padding: 4px; text-align: left; vertical-align: top; width: 35%"><img src="https://example.com/a.png" alt="示例图片" style="color: #1c1917; font-size: 15px; line-height: 1.85; text-align: left; width: 100%"></section><section style="color: #78716c; display: table-cell; font-size: 14px; line-height: 1.85; padding: 4px; text-align: left; vertical-align: middle">带说明文字</section></section>'
    );
  });

  it("qrcode.card 渲染字节不受影响", async () => {
    const result = await renderMarkdown(":::qrcode{.card}\n标题段落\n\n说明段落\n:::", {
      themeId: "default",
    });
    expect(result.html).toBe(
      '<section data-block="qrcode" data-variant="card" style="border: 1px solid #d6d3ce; border-radius: 6px; display: table; padding: 12px 16px; width: 100%"><section style="background-color: #f3f0eb; border: 1px solid #a8a29e; color: #1c1917; display: table-cell; font-size: 15px; height: 64px; line-height: 1.85; text-align: left; vertical-align: middle; width: 64px"></section><section style="color: #1c1917; display: table-cell; font-size: 15px; line-height: 1.85; padding-left: 12px; text-align: left; vertical-align: middle"><section style="color: #2d5a4e; font-size: 14px; font-weight: 700; letter-spacing: 0.5px; line-height: 1.85; text-align: left">SUBSCRIBE</section><section style="color: #1c1917; font-size: 15px; font-weight: 700; line-height: 1.85; margin: 4px 0; text-align: left">标题段落</section><section style="color: #44403c; font-size: 14px; line-height: 1.85; text-align: left">说明段落</section></section></section>'
    );
  });
});
