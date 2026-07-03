import { describe, expect, it } from "vitest";
import {
  aspectRatioDiff,
  meanColorDistance,
  rankScore,
} from "../../scripts/design-sync/overlay-precheck.ts";

describe("overlay-precheck 指标", () => {
  it("aspectRatioDiff 相同纵横比为 0", () => {
    expect(aspectRatioDiff({ width: 200, height: 100 }, { width: 400, height: 200 })).toBe(0);
  });

  it("aspectRatioDiff 归一化到 0-1 区间且对称", () => {
    const a = { width: 100, height: 100 };
    const b = { width: 400, height: 100 };
    const d1 = aspectRatioDiff(a, b);
    const d2 = aspectRatioDiff(b, a);
    expect(d1).toBeCloseTo(0.75);
    expect(d1).toBe(d2);
  });

  it("meanColorDistance 相同缓冲为 0，全反差为 255", () => {
    const black = new Uint8Array([0, 0, 0, 0, 0, 0]);
    const white = new Uint8Array([255, 255, 255, 255, 255, 255]);
    expect(meanColorDistance(black, black)).toBe(0);
    expect(meanColorDistance(black, white)).toBe(255);
  });

  it("meanColorDistance 拒绝长度不等或空缓冲", () => {
    expect(() => meanColorDistance(new Uint8Array([1]), new Uint8Array([1, 2]))).toThrow();
    expect(() => meanColorDistance(new Uint8Array([]), new Uint8Array([]))).toThrow();
  });

  it("rankScore 双指标各占一半权重", () => {
    expect(rankScore(1, 255)).toBe(1);
    expect(rankScore(0, 0)).toBe(0);
    expect(rankScore(0.5, 0)).toBe(0.25);
  });
});
