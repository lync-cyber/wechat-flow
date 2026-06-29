/**
 * sRGB hex → CIE XYZ (D65) → CIE Lab conversion.
 * Used for CIE76 ΔE_76 color difference computation.
 */

import { linearizeChannel, parseHexChannels } from "./srgb";

function hexToLinearRgb(hex: string): [number, number, number] {
  const [r, g, b] = parseHexChannels(hex);
  return [linearizeChannel(r), linearizeChannel(g), linearizeChannel(b)];
}

/** sRGB linear → XYZ D65 (IEC 61966-2-1 matrix). */
function linearRgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = r * 0.0193339 + g * 0.119192 + b * 0.9503041;
  return [x, y, z];
}

/** XYZ D65 → CIE Lab. D65 reference white: Xn=0.95047, Yn=1.0, Zn=1.08883. */
function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const epsilon = 0.008856;
  const kappa = 903.3;

  function f(t: number): number {
    return t > epsilon ? Math.cbrt(t) : (kappa * t + 16) / 116;
  }

  const fx = f(x / 0.95047);
  const fy = f(y / 1.0);
  const fz = f(z / 1.08883);

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bStar = 200 * (fy - fz);
  return [L, a, bStar];
}

/** Convert sRGB hex color to CIE Lab [L*, a*, b*]. */
export function hexToLab(hex: string): [number, number, number] {
  const [r, g, b] = hexToLinearRgb(hex);
  const [x, y, z] = linearRgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

/** CIE76 ΔE_76 = sqrt(ΔL² + Δa² + Δb²). */
export function deltaE76(hex1: string, hex2: string): number {
  const [l1, a1, b1] = hexToLab(hex1);
  const [l2, a2, b2] = hexToLab(hex2);
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}
