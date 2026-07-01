import { describe, expect, it } from "vitest";
import { verifyDeterminism } from "../../packages/core/src/verify-determinism.ts";

describe("AC-003/AC-005: verifyDeterminism true — stable render input", () => {
  it("returns true for a deterministic markdown input across 3 iterations", async () => {
    const result = await verifyDeterminism("# Hello\n\n世界。", undefined, 3);
    expect(result).toBe(true);
  });
});

describe("AC-005: verifyDeterminism false — render output diverges across runs", () => {
  it("returns false when the injected render produces different html each call", async () => {
    let n = 0;
    const nonDeterministicRender = async () => ({ html: String(n++) });
    const result = await verifyDeterminism("x", undefined, 3, nonDeterministicRender);
    expect(result).toBe(false);
  });
});

describe("边界: iterations 下限与恒定输出", () => {
  it("iterations=1 is clamped to at least 2 runs and returns true for constant output", async () => {
    const constantRender = async () => ({ html: "same-html" });
    const result = await verifyDeterminism("x", undefined, 1, constantRender);
    expect(result).toBe(true);
  });

  it("constant render output returns true across 3 explicit iterations", async () => {
    const constantRender = async () => ({ html: "same-html" });
    const result = await verifyDeterminism("x", undefined, 3, constantRender);
    expect(result).toBe(true);
  });
});
