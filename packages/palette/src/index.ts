export type { TokenDictionary, PaletteSeed } from "@wechat-flow/contracts";
export { buildDictionary } from "./tokens/dictionary-builder.ts";
export { wcagContrast, meetsWcagAA, WCAG_AA_MIN_RATIO } from "./wcag/contrast-validator.ts";
export { buildLightnessGradient, toOklch, oklchToHex, shiftLightness } from "./lch/derive.ts";

import type { PaletteSeed, TokenDictionary } from "@wechat-flow/contracts";
import { buildDictionary } from "./tokens/dictionary-builder.ts";

/**
 * Derives a full TokenDictionary from a single primary hex color (or extended seed).
 * Guarantees WCAG AA contrast on key text tokens. No external side effects.
 */
export function derivePalette(seed: PaletteSeed): TokenDictionary {
  return buildDictionary(seed);
}
