import { describe, expect, it } from "vitest";
import { measureColdStart } from "./cold-start.ts";

describe("measureColdStart: 冷启动测量机制验证（AC-001）", () => {
  it("返回 samples=5（iterations=5）", async () => {
    const result = await measureColdStart({ iterations: 5 });
    expect(result.samples).toBe(5);
  });

  it("name 字段为 'cold-start'", async () => {
    const result = await measureColdStart({ iterations: 5 });
    expect(result.name).toBe("cold-start");
  });

  it("p95 为有限正数（机制验证，不断言 <800ms）", async () => {
    const result = await measureColdStart({ iterations: 5 });
    expect(Number.isFinite(result.p95)).toBe(true);
    expect(result.p95).toBeGreaterThan(0);
  });

  it("p50 <= p95 <= p99（百分位单调递增）", async () => {
    const result = await measureColdStart({ iterations: 5 });
    expect(result.p50).toBeLessThanOrEqual(result.p95);
    expect(result.p95).toBeLessThanOrEqual(result.p99);
  });

  it("env.cpu 为非空字符串", async () => {
    const result = await measureColdStart({ iterations: 5 });
    expect(typeof result.env.cpu).toBe("string");
    expect(result.env.cpu.length).toBeGreaterThan(0);
  });

  it("env.node 为非空字符串", async () => {
    const result = await measureColdStart({ iterations: 5 });
    expect(typeof result.env.node).toBe("string");
    expect(result.env.node.length).toBeGreaterThan(0);
  });
});
