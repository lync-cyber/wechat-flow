import { wcagContrast as culoriContrast } from "culori";

/** WCAG 2.1 relative luminance contrast ratio between two hex colors. */
export function wcagContrast(hexA: string, hexB: string): number {
  return culoriContrast(hexA, hexB);
}

export const WCAG_AA_MIN_RATIO = 4.5;

/** Returns true when the contrast ratio meets WCAG AA for normal text. */
export function meetsWcagAA(hexFg: string, hexBg: string): boolean {
  return wcagContrast(hexFg, hexBg) >= WCAG_AA_MIN_RATIO;
}
