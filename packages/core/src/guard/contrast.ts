import type { GuardFailure } from "@wechat-flow/contracts";
import { linearizeChannel, parseHexChannels } from "./srgb";

/**
 * Compute relative luminance (WCAG 2.1) for a hex color string.
 * Accepts 6-char (#RRGGBB) or 8-char (#RRGGBBAA) hex; alpha channel ignored.
 */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHexChannels(hex);
  return 0.2126 * linearizeChannel(r) + 0.7152 * linearizeChannel(g) + 0.0722 * linearizeChannel(b);
}

/**
 * Compute WCAG 2.1 contrast ratio between two hex colors.
 * Returns (L_lighter + 0.05) / (L_darker + 0.05).
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type ColorPair = { fg: string; bg: string; label: string };

/**
 * Check a list of color pairs against the WCAG AA 4.5 threshold.
 * Returns a GuardFailure if any pair fails (or if a token is missing), null otherwise.
 */
export function checkWcagPairs(pairs: ColorPair[], dimension: string): GuardFailure | null {
  const violations: string[] = [];

  for (const { fg, bg, label } of pairs) {
    if (!fg || !bg) {
      violations.push(`${label}: token missing`);
      continue;
    }
    const ratio = contrastRatio(fg, bg);
    if (ratio < 4.5) {
      violations.push(`${label}: ${ratio.toFixed(2)} < 4.5`);
    }
  }

  if (violations.length === 0) return null;

  return {
    dimension,
    severity: "error",
    message: `WCAG AA contrast violations: ${violations.join("; ")}`,
  };
}
