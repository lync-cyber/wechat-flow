import "../../packages/blocks/src/index.ts";
import "../../packages/marks/src/index.ts";
import { expect, test } from "@playwright/test";
import { listAllVariants, registerTheme } from "../../packages/core/src/index.ts";
import businessTheme from "../../packages/themes/business/src/index.ts";
import defaultTheme from "../../packages/themes/default/src/index.ts";
import literaryTheme from "../../packages/themes/literary/src/index.ts";
import magazineTheme from "../../packages/themes/magazine/src/index.ts";
import techTheme from "../../packages/themes/tech/src/index.ts";
import { assertVariantFloor, buildFullMatrix, buildSampledMatrix } from "./story-matrix.ts";
import { renderStory } from "./story-render.ts";

test.beforeAll(() => {
  registerTheme(defaultTheme);
  registerTheme(businessTheme);
  registerTheme(literaryTheme);
  registerTheme(magazineTheme);
  registerTheme(techTheme);
});

// AC-008: fail-fast guard — must have ≥ 120 variants before matrix enumeration
assertVariantFloor(listAllVariants().length);

// VISUAL_FULL=1 enumerates the full variant matrix (nightly + baseline seeding);
// unset runs the PR-time deterministic sample.
const stories =
  process.env.VISUAL_FULL === "1" ? await buildFullMatrix() : await buildSampledMatrix();

for (const story of stories) {
  test(`visual: ${story.sceneName}`, async ({ page }) => {
    const html = await renderStory(story);
    await page.setContent(html);
    await expect(page).toHaveScreenshot(`${story.sceneName}.png`);
  });
}
