import { formatHex, oklch } from "culori";

export interface OklchColor {
  l: number;
  c: number;
  h: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Parses any culori-supported color string to OKLCh. */
export function toOklch(color: string): OklchColor {
  const parsed = oklch(color);
  if (!parsed) throw new Error(`Cannot parse color: ${color}`);
  return { l: parsed.l, c: parsed.c, h: parsed.h ?? 0 };
}

/** Serializes OKLCh values back to hex. */
export function oklchToHex(l: number, c: number, h: number): string {
  const hex = formatHex({ mode: "oklch", l, c, h });
  return hex ?? "#000000";
}

/** Derives a lightness-shifted hex color from an OKLCh base. */
export function shiftLightness(base: OklchColor, targetL: number, chromaScale = 1): string {
  const l = clamp(targetL, 0, 1);
  const c = clamp(base.c * chromaScale, 0, 0.4);
  return oklchToHex(l, c, base.h);
}

/** Derives the complementary hue (opposite on wheel). */
export function complementaryHue(h: number): number {
  return (h + 180) % 360;
}

/** Derives the analogous hue (±30°). */
export function analogousHue(h: number, offset = 30): number {
  return (h + offset + 360) % 360;
}

export interface LchGradient {
  lightest: string;
  lighter: string;
  light: string;
  base: string;
  dark: string;
  darker: string;
  darkest: string;
}

/** Builds a 7-stop lightness gradient from a single seed hex. */
export function buildLightnessGradient(seedHex: string): LchGradient {
  const base = toOklch(seedHex);
  return {
    lightest: shiftLightness(base, 0.97, 0.1),
    lighter: shiftLightness(base, 0.92, 0.3),
    light: shiftLightness(base, 0.8, 0.6),
    base: oklchToHex(clamp(base.l, 0, 1), clamp(base.c, 0, 0.4), base.h),
    dark: shiftLightness(base, 0.35, 0.9),
    darker: shiftLightness(base, 0.22, 0.8),
    darkest: shiftLightness(base, 0.12, 0.6),
  };
}
