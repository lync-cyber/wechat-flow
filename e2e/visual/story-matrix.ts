import { describeBlock, listAllVariants, listBlocks } from "../../packages/core/src/index.ts";

export interface VisualStory {
  themeId: string;
  blockId: string;
  variantId: string;
  sceneName: string;
  tier: "p0" | "composite";
  markdown?: string;
}

export interface MatrixRuleset {
  sampleRatio: number;
  seed: string;
}

const THEME_IDS = ["default", "business", "literary", "magazine", "tech"] as const;

// kebab-case sanitization: lowercase, replace non-alphanumeric with hyphens, collapse runs
function toKebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function assertVariantFloor(count: number): void {
  if (count < 120) {
    throw new Error(
      `Variant registry must have at least 120 variants registered, but found ${count}. Ensure blocks and marks packages are imported before building visual story matrix.`
    );
  }
}

export async function buildFullMatrix(): Promise<VisualStory[]> {
  assertVariantFloor(listAllVariants().length);

  const stories: VisualStory[] = [];
  for (const block of listBlocks()) {
    for (const variant of block.variants) {
      for (const themeId of THEME_IDS) {
        const blockKebab = toKebab(block.id);
        const variantKebab = toKebab(variant.id);
        const sceneName = `${themeId}-${blockKebab}-${variantKebab}`;
        stories.push({
          themeId,
          blockId: block.id,
          variantId: variant.id,
          sceneName,
          tier: "p0",
        });
      }
    }
  }
  return stories;
}

// 8 core P0 block IDs covering distinct content categories
const P0_BLOCK_IDS = [
  "heading",
  "paragraph",
  "callout",
  "quote",
  "card",
  "divider",
  "steps",
  "pull-quote",
] as const;

// 8 distinct composite markdowns — each uses a different subset/order of blocks
// to guarantee visually non-identical renderings across the composite tier
const COMPOSITE_MARKDOWNS: readonly string[] = [
  // 1: heading + paragraph + callout
  [
    "## Article Introduction",
    "",
    "Opening paragraph establishing the context for readers.",
    "",
    ":::callout{class=default}",
    "Key insight highlighted for the reader.",
    ":::",
  ].join("\n"),

  // 2: quote + pull-quote
  [
    ":::quote{class=default}",
    "The measure of intelligence is the ability to change.",
    ":::",
    "",
    ":::pull-quote{class=default}",
    "Change is the only constant.",
    ":::",
  ].join("\n"),

  // 3: heading + steps + divider
  [
    "## Step-by-Step Guide",
    "",
    ":::steps{class=default}",
    "Follow these steps carefully.",
    ":::",
    "",
    ":::divider{class=default}",
    ":::",
  ].join("\n"),

  // 4: card + callout + paragraph
  [
    ":::card{class=default}",
    "Featured card with summary content.",
    ":::",
    "",
    ":::callout{class=filled}",
    "Important notice for all readers.",
    ":::",
    "",
    "Closing paragraph with additional context.",
  ].join("\n"),

  // 5: heading + quote + card
  [
    "## Deep Dive",
    "",
    ":::quote{class=bordered}",
    "Bordered quote with attribution text.",
    ":::",
    "",
    ":::card{class=elevated}",
    "Elevated card showcasing a product or resource.",
    ":::",
  ].join("\n"),

  // 6: pull-quote + steps + callout
  [
    ":::pull-quote{class=large}",
    "Large pull quote drawing reader attention.",
    ":::",
    "",
    ":::steps{class=numbered}",
    "Numbered step instructions.",
    ":::",
    "",
    ":::callout{class=warning}",
    "Warning: review before proceeding.",
    ":::",
  ].join("\n"),

  // 7: divider + paragraph + quote + card
  [
    ":::divider{class=decorative}",
    ":::",
    "",
    "Introductory paragraph before the quote.",
    "",
    ":::quote{class=filled}",
    "Filled quote block content.",
    ":::",
    "",
    ":::card{class=outlined}",
    "Outlined card for secondary information.",
    ":::",
  ].join("\n"),

  // 8: heading + callout + pull-quote + divider
  [
    "## Summary and Takeaways",
    "",
    ":::callout{class=success}",
    "You have completed this section successfully.",
    ":::",
    "",
    ":::pull-quote{class=decorated}",
    "Decorated pull quote for visual emphasis.",
    ":::",
    "",
    ":::divider{class=thick}",
    ":::",
  ].join("\n"),
];

export async function buildCoreMatrix(): Promise<VisualStory[]> {
  const stories: VisualStory[] = [];

  for (const themeId of THEME_IDS) {
    // P0 scenes: one per P0 block's default variant
    for (const blockId of P0_BLOCK_IDS) {
      const block = describeBlock(blockId);
      if (!block) continue;
      const variantId = block.variants[0]?.id ?? "default";
      const sceneName = `${themeId}-${toKebab(blockId)}-${toKebab(variantId)}`;
      stories.push({ themeId, blockId, variantId, sceneName, tier: "p0" });
    }

    // Composite scenes: 8 distinct multi-block markdowns per theme
    for (let i = 0; i < COMPOSITE_MARKDOWNS.length; i++) {
      const sceneName = `${themeId}-composite-${i + 1}`;
      stories.push({
        themeId,
        blockId: "heading",
        variantId: "default",
        sceneName,
        tier: "composite",
        markdown: COMPOSITE_MARKDOWNS[i],
      });
    }
  }

  return stories;
}

// Deterministic hash-based PRNG: murmur-inspired 32-bit hash
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
    h >>>= 0;
  }
  return h;
}

// Deterministic shuffle using Fisher-Yates with hash-seeded indices
function deterministicShuffle<T>(items: T[], seed: string): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const key = `${seed}:${i}`;
    const hash = hashString(key);
    const j = hash % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j] as T;
    arr[j] = tmp as T;
  }
  return arr;
}

export async function buildSampledMatrix(ruleset?: MatrixRuleset): Promise<VisualStory[]> {
  const sampleRatio = ruleset?.sampleRatio ?? 0.2;
  const seed = ruleset?.seed ?? "t058-default-seed";

  const full = await buildFullMatrix();
  const targetCount = Math.ceil(full.length * sampleRatio);

  const shuffled = deterministicShuffle(full, seed);
  return shuffled.slice(0, targetCount);
}
