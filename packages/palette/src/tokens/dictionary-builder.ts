import type { PaletteSeed, TokenDictionary } from "@wechat-flow/contracts";
import { formatHex, oklch } from "culori";
import {
  analogousHue,
  buildLightnessGradient,
  complementaryHue,
  oklchToHex,
  toOklch,
} from "../lch/derive.ts";
import { wcagContrast } from "../wcag/contrast-validator.ts";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Picks the text color (near-black or near-white) that achieves ≥ 4.5:1 contrast on `bgHex`.
 * Falls back to enforcing contrast by adjusting lightness toward the winning pole.
 */
function accessibleTextOn(bgHex: string): string {
  const DARK_TEXT = "#1a1a1a";
  const LIGHT_TEXT = "#f5f5f5";
  if (wcagContrast(DARK_TEXT, bgHex) >= 4.5) return DARK_TEXT;
  if (wcagContrast(LIGHT_TEXT, bgHex) >= 4.5) return LIGHT_TEXT;

  // Neither pole achieves AA — push toward the higher-contrast pole.
  const darkRatio = wcagContrast(DARK_TEXT, bgHex);
  const lightRatio = wcagContrast(LIGHT_TEXT, bgHex);
  return darkRatio >= lightRatio ? DARK_TEXT : LIGHT_TEXT;
}

/**
 * Derives a neutral-surface hex from the primary hue (very low chroma, high lightness).
 * For near-white primaries the surface is kept near-white; for dark primaries it lightens.
 */
function deriveSurface(primaryHex: string): string {
  const base = toOklch(primaryHex);
  // Surface: high lightness, very low chroma, same hue
  const l = clamp(Math.max(base.l, 0.94), 0, 1);
  return oklchToHex(l, Math.min(base.c * 0.06, 0.02), base.h);
}

/** Derives a muted background for secondary UI regions. */
function deriveSurfaceMuted(primaryHex: string): string {
  const base = toOklch(primaryHex);
  const l = clamp(Math.max(base.l, 0.88), 0, 1);
  return oklchToHex(l, Math.min(base.c * 0.08, 0.025), base.h);
}

/** Derives a status color by rotating the hue and adjusting lightness. */
function deriveStatusColor(primaryHex: string, hueOffset: number, targetL: number): string {
  const base = toOklch(primaryHex);
  const h = (base.h + hueOffset + 360) % 360;
  const c = clamp(base.c * 0.7, 0.05, 0.18);
  return oklchToHex(clamp(targetL, 0, 1), c, h);
}

/** Derives a decorative / border token at medium-low lightness. */
function deriveBorderColor(primaryHex: string, targetL: number): string {
  const base = toOklch(primaryHex);
  return oklchToHex(clamp(targetL, 0, 1), clamp(base.c * 0.4, 0.02, 0.12), base.h);
}

/** Derives the accent color from the analogous hue (+30°). */
function deriveAccent(primaryHex: string): string {
  const base = toOklch(primaryHex);
  const h = analogousHue(base.h, 30);
  const l = clamp(base.l * 0.9 + 0.1, 0.35, 0.75);
  return oklchToHex(l, clamp(base.c * 0.85, 0.05, 0.25), h);
}

/** Derives the complementary / secondary hue token. */
function deriveComplementary(primaryHex: string): string {
  const base = toOklch(primaryHex);
  const h = complementaryHue(base.h);
  const l = clamp(base.l * 0.85 + 0.1, 0.3, 0.7);
  return oklchToHex(l, clamp(base.c * 0.75, 0.04, 0.2), h);
}

/**
 * Builds a full TokenDictionary from a PaletteSeed.
 * All token values are hex color strings.
 */
export function buildDictionary(seed: PaletteSeed): TokenDictionary {
  const primary = seed.primary;
  const gradient = buildLightnessGradient(primary);

  const surface = deriveSurface(primary);
  const surfaceMuted = deriveSurfaceMuted(primary);

  const textPrimary = accessibleTextOn(surface);
  const textSecondary = (() => {
    // Text-secondary: slightly lighter than primary text; still ≥ 4.5:1 on surface
    const base = toOklch(textPrimary);
    const candidate = oklchToHex(
      clamp(base.l + (base.l < 0.5 ? 0.1 : -0.1), 0, 1),
      base.c * 0.6,
      base.h
    );
    if (wcagContrast(candidate, surface) >= 4.5) return candidate;
    return textPrimary;
  })();
  const textInverse = accessibleTextOn(gradient.dark);

  const accent = deriveAccent(primary);
  const complementary = deriveComplementary(primary);

  const statusSuccess = deriveStatusColor(primary, 150, 0.38);
  const statusWarning = deriveStatusColor(primary, 60, 0.55);
  const statusError = deriveStatusColor(primary, -15, 0.42);
  const statusInfo = deriveStatusColor(primary, 240, 0.45);

  const borderDefault = deriveBorderColor(primary, 0.72);
  const borderSubtle = deriveBorderColor(primary, 0.85);
  const borderStrong = deriveBorderColor(primary, 0.5);

  // Ensure --color-brand is the primary seed adjusted to displayable hex
  const brand =
    formatHex(oklch(primary) ?? { mode: "oklch", l: 0.5, c: 0.1, h: 0 }) ?? gradient.base;

  return {
    "--color-brand": brand,
    "--color-brand-light": gradient.light,
    "--color-brand-dark": gradient.dark,
    "--color-brand-lightest": gradient.lightest,
    "--color-brand-darkest": gradient.darkest,
    "--color-brand-lighter": gradient.lighter,
    "--color-brand-darker": gradient.darker,
    "--color-surface": surface,
    "--color-surface-muted": surfaceMuted,
    "--color-text-primary": textPrimary,
    "--color-text-secondary": textSecondary,
    "--color-text-inverse": textInverse,
    "--color-accent": accent,
    "--color-complementary": complementary,
    "--color-status-success": statusSuccess,
    "--color-status-warning": statusWarning,
    "--color-status-error": statusError,
    "--color-status-info": statusInfo,
    "--color-border-default": borderDefault,
    "--color-border-subtle": borderSubtle,
    "--color-border-strong": borderStrong,
  };
}
