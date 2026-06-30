import { describe, expect, it } from "vitest";
import {
  DIFF_RATIO_THRESHOLD,
  PIXELMATCH_OPTIONS,
  evaluateDiff,
} from "../../../e2e/visual/pixelmatch-config.ts";

// AC-003 — pixelmatch configuration contract + diff judgment logic

// ---------------------------------------------------------------------------
// AC-003: pixelmatch options contract — threshold=0.2, includeAA=false
// ---------------------------------------------------------------------------
describe("AC-003: PIXELMATCH_OPTIONS contract", () => {
  it("threshold is 0.2", () => {
    expect(PIXELMATCH_OPTIONS.threshold).toBe(0.2);
  });

  it("includeAA is false", () => {
    expect(PIXELMATCH_OPTIONS.includeAA).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC-003: diff ratio threshold = 0.05 and evaluateDiff judgment logic
// ---------------------------------------------------------------------------
describe("AC-003: DIFF_RATIO_THRESHOLD is 0.05", () => {
  it("DIFF_RATIO_THRESHOLD equals 0.05", () => {
    expect(DIFF_RATIO_THRESHOLD).toBe(0.05);
  });
});

describe("AC-003: evaluateDiff() — pass/fail judgment based on diff ratio", () => {
  it("ratio=0 (identical images) → pass", () => {
    // Total pixels = 100, diffPixels = 0, ratio = 0.0
    const result = evaluateDiff({ totalPixels: 100, diffPixels: 0 });
    expect(result.passed).toBe(true);
    expect(result.ratio).toBe(0);
  });

  it("ratio=0.05 (at threshold boundary) → pass", () => {
    // Total pixels = 100, diffPixels = 5, ratio = 0.05 — exactly at boundary → pass (≤ 0.05)
    const result = evaluateDiff({ totalPixels: 100, diffPixels: 5 });
    expect(result.passed).toBe(true);
    expect(result.ratio).toBe(0.05);
  });

  it("ratio=0.049 (just below threshold) → pass", () => {
    const result = evaluateDiff({ totalPixels: 1000, diffPixels: 49 });
    expect(result.passed).toBe(true);
    expect(result.ratio).toBeCloseTo(0.049, 3);
  });

  it("ratio=0.051 (just above threshold) → fail", () => {
    // Total pixels = 1000, diffPixels = 51, ratio ≈ 0.051 → fail (> 0.05)
    const result = evaluateDiff({ totalPixels: 1000, diffPixels: 51 });
    expect(result.passed).toBe(false);
    expect(result.ratio).toBeCloseTo(0.051, 3);
  });

  it("ratio=0.5 (half pixels differ) → fail", () => {
    const result = evaluateDiff({ totalPixels: 200, diffPixels: 100 });
    expect(result.passed).toBe(false);
    expect(result.ratio).toBeCloseTo(0.5, 3);
  });

  it("ratio=1.0 (all pixels differ) → fail", () => {
    const result = evaluateDiff({ totalPixels: 400, diffPixels: 400 });
    expect(result.passed).toBe(false);
    expect(result.ratio).toBe(1);
  });

  it("result.ratio is computed as diffPixels / totalPixels (not percentage)", () => {
    const result = evaluateDiff({ totalPixels: 200, diffPixels: 10 });
    // ratio must be 10/200 = 0.05, not 5 (percent) or 50 (percent * 1000)
    expect(result.ratio).toBeCloseTo(0.05, 4);
  });
});
