// Keys are `${blockId}::${variantId}`. These variants are absent from their block's
// `variants` array — not deleted, but withheld pending a DOM output contract that
// `audio`/`video` do not yet have (empty directiveAttrs schema, no baseStyle, no
// decorate hook; the block only wraps body text in a bare <section>). WeChat's
// official account platform does not accept raw <audio>/<video> tag embedding, so
// "full"/"mini"/"with-caption" cannot be given a real implementation until an
// architect-owned reevaluation of the intended output (placeholder card? WeChat
// media asset API integration?) lands and reopens IMPORT/PATCH routing for these
// variant IDs.
export const KNOWN_BLOCKED_VARIANTS: Set<string> = new Set([
  "audio::full",
  "audio::mini",
  "video::with-caption",
]);
