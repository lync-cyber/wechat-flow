import { beforeAll, describe, expect, it } from "vitest";
import "../../../packages/blocks/src/index.ts";
import "../../../packages/marks/src/index.ts";
import {
  type MatrixRuleset,
  type VisualStory,
  assertVariantFloor,
  buildCoreMatrix,
  buildFullMatrix,
  buildSampledMatrix,
} from "../../../e2e/visual/story-matrix.ts";
import { listAllVariants, registerTheme } from "../../../packages/core/src/index.ts";
import businessTheme from "../../../packages/themes/business/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";
import literaryTheme from "../../../packages/themes/literary/src/index.ts";
import magazineTheme from "../../../packages/themes/magazine/src/index.ts";
import techTheme from "../../../packages/themes/tech/src/index.ts";

// AC-001 / AC-002 / AC-008 — story-matrix helper tests

const THEME_IDS = ["default", "business", "literary", "magazine", "tech"] as const;
const EXPECTED_THEME_COUNT = 5;
const VARIANT_FLOOR = 120;
const CORE_SCENE_FLOOR = 8;

beforeAll(() => {
  registerTheme(defaultTheme);
  registerTheme(businessTheme);
  registerTheme(literaryTheme);
  registerTheme(magazineTheme);
  registerTheme(techTheme);
});

// ---------------------------------------------------------------------------
// AC-008: fail-fast guard — registry must hold ≥ 120 variants before enumeration
// ---------------------------------------------------------------------------
describe("AC-008: listAllVariants() floor guard", () => {
  it("current registry has at least 120 variants registered", () => {
    const variants = listAllVariants();
    expect(variants.length).toBeGreaterThanOrEqual(VARIANT_FLOOR);
  });

  it("assertVariantFloor() throws an error naming the 120 floor below it, and passes at/above 120", () => {
    // Match /120/ not /variant/i: a bare "is not a function" TypeError contains
    // "Variant" but never "120", so this stays red until GREEN implements the guard.
    expect(() => assertVariantFloor(50)).toThrow(/120/);
    expect(() => assertVariantFloor(120)).not.toThrow();
    expect(() => assertVariantFloor(153)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// AC-001 / AC-002: full matrix enumeration
// ---------------------------------------------------------------------------
describe("AC-002: buildFullMatrix() — 5 themes × all variants", () => {
  it("produces exactly listAllVariants().length × 5 stories", async () => {
    const variantCount = listAllVariants().length;
    const expectedTotal = variantCount * EXPECTED_THEME_COUNT;
    const stories: VisualStory[] = await buildFullMatrix();
    expect(stories.length).toBe(expectedTotal);
  });

  it("covers all 5 theme IDs", async () => {
    const stories: VisualStory[] = await buildFullMatrix();
    const themesPresent = new Set(stories.map((s) => s.themeId));
    for (const themeId of THEME_IDS) {
      expect(themesPresent.has(themeId)).toBe(true);
    }
    expect(themesPresent.size).toBe(EXPECTED_THEME_COUNT);
  });

  it("every story scene name starts with its themeId prefix (AC-004 {theme}-{scene} shape)", async () => {
    const stories: VisualStory[] = await buildFullMatrix();
    for (const story of stories) {
      expect(
        story.sceneName.startsWith(`${story.themeId}-`),
        `sceneName "${story.sceneName}" must start with themeId "${story.themeId}-"`
      ).toBe(true);
    }
  });

  it("every story scene name is non-empty and kebab-case (only a-z, 0-9, hyphens)", async () => {
    const stories: VisualStory[] = await buildFullMatrix();
    const kebabPattern = /^[a-z][a-z0-9-]+$/;
    for (const story of stories) {
      expect(
        kebabPattern.test(story.sceneName),
        `sceneName "${story.sceneName}" must be non-empty kebab-case`
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-002: core matrix — ≥ 8 P0 scenes + ≥ 8 composite scenes per theme
// ---------------------------------------------------------------------------
describe("AC-002: buildCoreMatrix() — per-theme scene counts", () => {
  it("covers 5 themes", async () => {
    const stories: VisualStory[] = await buildCoreMatrix();
    const themesPresent = new Set(stories.map((s) => s.themeId));
    expect(themesPresent.size).toBe(EXPECTED_THEME_COUNT);
  });

  it("each theme has at least 8 P0 scenes", async () => {
    const stories: VisualStory[] = await buildCoreMatrix();
    for (const themeId of THEME_IDS) {
      const themeStories = stories.filter((s) => s.themeId === themeId && s.tier === "p0");
      expect(
        themeStories.length,
        `theme "${themeId}" must have ≥ ${CORE_SCENE_FLOOR} P0 scenes, got ${themeStories.length}`
      ).toBeGreaterThanOrEqual(CORE_SCENE_FLOOR);
    }
  });

  it("each theme has at least 8 composite scenes", async () => {
    const stories: VisualStory[] = await buildCoreMatrix();
    for (const themeId of THEME_IDS) {
      const compositeStories = stories.filter(
        (s) => s.themeId === themeId && s.tier === "composite"
      );
      expect(
        compositeStories.length,
        `theme "${themeId}" must have ≥ ${CORE_SCENE_FLOOR} composite scenes, got ${compositeStories.length}`
      ).toBeGreaterThanOrEqual(CORE_SCENE_FLOOR);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-002: sampled matrix — sampleRatio default 0.2, deterministic with seed
// ---------------------------------------------------------------------------
describe("AC-002: buildSampledMatrix() — sampling contract", () => {
  it("default sampleRatio=0.2 yields approximately ceil(full × 0.2) stories", async () => {
    const fullStories: VisualStory[] = await buildFullMatrix();
    const sampledStories: VisualStory[] = await buildSampledMatrix();
    const expectedMin = Math.ceil(fullStories.length * 0.2) - 1; // ±1 tolerance
    const expectedMax = Math.ceil(fullStories.length * 0.2) + 1;
    expect(sampledStories.length).toBeGreaterThanOrEqual(expectedMin);
    expect(sampledStories.length).toBeLessThanOrEqual(expectedMax);
  });

  it("same seed produces identical sampled story lists (determinism)", async () => {
    const ruleset: MatrixRuleset = { sampleRatio: 0.2, seed: "t058-fixed-seed" };
    const first: VisualStory[] = await buildSampledMatrix(ruleset);
    const second: VisualStory[] = await buildSampledMatrix(ruleset);
    expect(first.map((s) => s.sceneName)).toEqual(second.map((s) => s.sceneName));
  });

  it("custom sampleRatio=0.5 yields approximately ceil(full × 0.5) stories", async () => {
    const fullStories: VisualStory[] = await buildFullMatrix();
    const ruleset: MatrixRuleset = { sampleRatio: 0.5, seed: "t058-half" };
    const sampledStories: VisualStory[] = await buildSampledMatrix(ruleset);
    const expectedMin = Math.ceil(fullStories.length * 0.5) - 1;
    const expectedMax = Math.ceil(fullStories.length * 0.5) + 1;
    expect(sampledStories.length).toBeGreaterThanOrEqual(expectedMin);
    expect(sampledStories.length).toBeLessThanOrEqual(expectedMax);
  });

  it("sampled stories are a subset of full matrix scene names", async () => {
    const fullStories: VisualStory[] = await buildFullMatrix();
    const fullSceneNames = new Set(fullStories.map((s) => s.sceneName));
    const sampledStories: VisualStory[] = await buildSampledMatrix();
    for (const story of sampledStories) {
      expect(
        fullSceneNames.has(story.sceneName),
        `sampled scene "${story.sceneName}" not found in full matrix`
      ).toBe(true);
    }
  });
});
