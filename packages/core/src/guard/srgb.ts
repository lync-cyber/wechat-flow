/**
 * Shared sRGB utilities for hex parsing and WCAG channel linearization.
 */

/**
 * Parse a hex color string (#RRGGBB or #RRGGBBAA) into 8-bit [R, G, B] channels.
 * Alpha channel is ignored when present.
 */
export function parseHexChannels(hex: string): [number, number, number] {
  const h = hex.length === 9 ? hex.slice(0, 7) : hex;
  const r = Number.parseInt(h.slice(1, 3), 16);
  const g = Number.parseInt(h.slice(3, 5), 16);
  const b = Number.parseInt(h.slice(5, 7), 16);
  return [r, g, b];
}

/** Linearize an 8-bit sRGB channel value per WCAG 2.1 §1.4.3. */
export function linearizeChannel(c8: number): number {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
