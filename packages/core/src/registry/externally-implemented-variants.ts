import { DIVIDER_SVG_VARIANTS } from "../pipeline/divider-decoration.ts";

// Some variants are implemented by a render-pipeline stage instead of a baseStyle
// delta or a block decorate hook — the block definition looks empty, yet the render
// injects real decoration. Static predicates can't see the pipeline, so each stage's
// variant SSOT is projected here into `${blockId}::${variantId}` keys the guard reads.
const EXTERNAL_IMPL_SOURCES: ReadonlyArray<{ blockId: string; variantIds: ReadonlySet<string> }> = [
  { blockId: "divider", variantIds: DIVIDER_SVG_VARIANTS },
];

export const EXTERNALLY_IMPLEMENTED_VARIANTS: Set<string> = new Set(
  EXTERNAL_IMPL_SOURCES.flatMap((source) =>
    [...source.variantIds].map((variantId) => `${source.blockId}::${variantId}`)
  )
);
