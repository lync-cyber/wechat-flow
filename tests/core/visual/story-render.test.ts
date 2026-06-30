import { beforeAll, describe, expect, it } from "vitest";
import "../../../packages/blocks/src/index.ts";
import "../../../packages/marks/src/index.ts";
import { buildCoreMatrix } from "../../../e2e/visual/story-matrix.ts";
import { type VisualStory, renderStory } from "../../../e2e/visual/story-render.ts";
import { describeBlock, listAllVariants, registerTheme } from "../../../packages/core/src/index.ts";
import businessTheme from "../../../packages/themes/business/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";
import literaryTheme from "../../../packages/themes/literary/src/index.ts";
import magazineTheme from "../../../packages/themes/magazine/src/index.ts";
import techTheme from "../../../packages/themes/tech/src/index.ts";

// AC-001 / business_rules — story rendering + variant distinctness tests

const THEME_IDS = ["default", "business", "literary", "magazine", "tech"] as const;

beforeAll(() => {
  registerTheme(defaultTheme);
  registerTheme(businessTheme);
  registerTheme(literaryTheme);
  registerTheme(magazineTheme);
  registerTheme(techTheme);
});

// ---------------------------------------------------------------------------
// AC-001: all 5 themes render non-empty inline-styled HTML without <style>/<script>
// ---------------------------------------------------------------------------
describe("AC-001: renderStory() produces inline-styled HTML across all 5 themes", () => {
  for (const themeId of THEME_IDS) {
    it(`theme "${themeId}" renders a heading story to non-empty HTML with inline style`, async () => {
      const story: VisualStory = {
        themeId,
        blockId: "heading",
        variantId: "default",
        sceneName: `${themeId}-heading-default`,
        tier: "p0",
      };
      const html = await renderStory(story);

      expect(html.length).toBeGreaterThan(0);
      // Inline-styled: must contain at least one style="..." attribute
      expect(html).toMatch(/style="[^"]+"/);
    });

    it(`theme "${themeId}" HTML has no <style> tag (must survive wechat paste — AC-003 T-057 contract)`, async () => {
      const story: VisualStory = {
        themeId,
        blockId: "heading",
        variantId: "default",
        sceneName: `${themeId}-heading-default`,
        tier: "p0",
      };
      const html = await renderStory(story);
      expect(/<style[\s>]/i.test(html)).toBe(false);
    });

    it(`theme "${themeId}" HTML has no <script> tag`, async () => {
      const story: VisualStory = {
        themeId,
        blockId: "paragraph",
        variantId: "default",
        sceneName: `${themeId}-paragraph-default`,
        tier: "p0",
      };
      const html = await renderStory(story);
      expect(/<script[\s>]/i.test(html)).toBe(false);
    });
  }
});

// ---------------------------------------------------------------------------
// business_rules: variant distinctness — different variants of same block must
// produce visually distinguishable HTML (different rendered output)
// ---------------------------------------------------------------------------
describe("business_rules: variant distinctness invariant", () => {
  it("callout block: 'default' and 'filled' variants produce different HTML for each theme", async () => {
    const calloutBlock = describeBlock("callout");
    // callout has variants: default, filled, minimal, info, success, warning, error, tip, note, important
    expect(calloutBlock).toBeDefined();
    const variantIds = (calloutBlock?.variants ?? []).map((v) => v.id);
    // Guard: both variants must be registered for this test to be meaningful
    expect(variantIds).toContain("default");
    expect(variantIds).toContain("filled");

    for (const themeId of THEME_IDS) {
      const defaultStory: VisualStory = {
        themeId,
        blockId: "callout",
        variantId: "default",
        sceneName: `${themeId}-callout-default`,
        tier: "p0",
      };
      const filledStory: VisualStory = {
        themeId,
        blockId: "callout",
        variantId: "filled",
        sceneName: `${themeId}-callout-filled`,
        tier: "p0",
      };
      const defaultHtml = await renderStory(defaultStory);
      const filledHtml = await renderStory(filledStory);

      expect(defaultHtml, `theme "${themeId}" callout default must not be empty`).toMatch(
        /style="[^"]+"/
      );
      expect(
        defaultHtml !== filledHtml,
        `theme "${themeId}" callout "default" and "filled" must render different HTML`
      ).toBe(true);
    }
  });

  it("quote block: 'default' and 'bordered' variants produce different HTML for each theme", async () => {
    const quoteBlock = describeBlock("quote");
    expect(quoteBlock).toBeDefined();
    const variantIds = (quoteBlock?.variants ?? []).map((v) => v.id);
    expect(variantIds).toContain("default");
    expect(variantIds).toContain("bordered");

    for (const themeId of THEME_IDS) {
      const defaultStory: VisualStory = {
        themeId,
        blockId: "quote",
        variantId: "default",
        sceneName: `${themeId}-quote-default`,
        tier: "p0",
      };
      const borderedStory: VisualStory = {
        themeId,
        blockId: "quote",
        variantId: "bordered",
        sceneName: `${themeId}-quote-bordered`,
        tier: "p0",
      };
      const defaultHtml = await renderStory(defaultStory);
      const borderedHtml = await renderStory(borderedStory);

      expect(
        defaultHtml !== borderedHtml,
        `theme "${themeId}" quote "default" and "bordered" must render different HTML`
      ).toBe(true);
    }
  });

  it("heading block: 'default' and 'underline' variants produce different HTML", async () => {
    const headingBlock = describeBlock("heading");
    expect(headingBlock).toBeDefined();
    const variantIds = (headingBlock?.variants ?? []).map((v) => v.id);
    expect(variantIds).toContain("default");
    expect(variantIds).toContain("underline");

    for (const themeId of THEME_IDS) {
      const defaultStory: VisualStory = {
        themeId,
        blockId: "heading",
        variantId: "default",
        sceneName: `${themeId}-heading-default`,
        tier: "p0",
      };
      const underlineStory: VisualStory = {
        themeId,
        blockId: "heading",
        variantId: "underline",
        sceneName: `${themeId}-heading-underline`,
        tier: "p0",
      };
      const defaultHtml = await renderStory(defaultStory);
      const underlineHtml = await renderStory(underlineStory);

      expect(
        defaultHtml !== underlineHtml,
        `theme "${themeId}" heading "default" and "underline" must render different HTML`
      ).toBe(true);
    }
  });

  it("paragraph block: 'default' and 'indented' variants produce different HTML", async () => {
    for (const themeId of THEME_IDS) {
      const defaultStory: VisualStory = {
        themeId,
        blockId: "paragraph",
        variantId: "default",
        sceneName: `${themeId}-paragraph-default`,
        tier: "p0",
      };
      const indentedStory: VisualStory = {
        themeId,
        blockId: "paragraph",
        variantId: "indented",
        sceneName: `${themeId}-paragraph-indented`,
        tier: "p0",
      };
      const defaultHtml = await renderStory(defaultStory);
      const indentedHtml = await renderStory(indentedStory);

      expect(
        defaultHtml !== indentedHtml,
        `theme "${themeId}" paragraph "default" and "indented" must render different HTML`
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-001: cross-theme distinctness — same block/variant should differ across themes
// (themes apply different style tokens → different inline style values)
// ---------------------------------------------------------------------------
describe("AC-001: same block/variant renders differently across themes", () => {
  it("heading default variant renders different HTML in 'default' vs 'magazine' theme", async () => {
    const allVariants = listAllVariants();
    // Guard: heading/default must be in registry
    const found = allVariants.find((v) => v.blockId === "heading" && v.id === "default");
    expect(found).toBeDefined();

    const defaultThemeStory: VisualStory = {
      themeId: "default",
      blockId: "heading",
      variantId: "default",
      sceneName: "default-heading-default",
      tier: "p0",
    };
    const magazineThemeStory: VisualStory = {
      themeId: "magazine",
      blockId: "heading",
      variantId: "default",
      sceneName: "magazine-heading-default",
      tier: "p0",
    };
    const defaultHtml = await renderStory(defaultThemeStory);
    const magazineHtml = await renderStory(magazineThemeStory);

    // Cross-theme rendering must differ (themes have different tokens)
    expect(
      defaultHtml !== magazineHtml,
      'heading "default" must render differently in "default" vs "magazine" theme'
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// composite distinctness: each theme's 8 composite scenes must render unique HTML
// ---------------------------------------------------------------------------
describe("composite distinctness: all composite stories per theme render unique HTML", () => {
  const THEME_IDS_CONST = ["default", "business", "literary", "magazine", "tech"] as const;

  for (const themeId of THEME_IDS_CONST) {
    it(`theme "${themeId}": composite stories all produce distinct HTML`, async () => {
      const allStories = await buildCoreMatrix();
      const compositeStories = allStories.filter(
        (s) => s.themeId === themeId && s.tier === "composite"
      );
      const htmlSet = new Set<string>();
      for (const story of compositeStories) {
        const html = await renderStory(story);
        htmlSet.add(html);
      }
      expect(
        htmlSet.size,
        `theme "${themeId}" composite stories must all render distinct HTML, got ${htmlSet.size} unique out of ${compositeStories.length}`
      ).toBe(compositeStories.length);
    });
  }
});
