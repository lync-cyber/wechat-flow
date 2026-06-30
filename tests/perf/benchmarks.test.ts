// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { measureThemeSwitch } from "./theme-switch.ts";
import { measureTypingLatency } from "./typing-latency.ts";

// ---------------------------------------------------------------------------
// AC-001: typing-latency benchmark 机制验证（小 iterations，不断言 <50ms）
// ---------------------------------------------------------------------------

describe("measureTypingLatency: 测量机制可跑通（AC-001）", () => {
  it("返回 samples=20（iterations=20，docSize=2000）", async () => {
    const result = await measureTypingLatency({ iterations: 20, docSize: 2000 });
    expect(result.samples).toBe(20);
  });

  it("name 字段为 'typing-latency'", async () => {
    const result = await measureTypingLatency({ iterations: 20, docSize: 2000 });
    expect(result.name).toBe("typing-latency");
  });

  it("p95 为有限正数（机制验证，不断言 <50ms）", async () => {
    const result = await measureTypingLatency({ iterations: 20, docSize: 2000 });
    expect(Number.isFinite(result.p95)).toBe(true);
    expect(result.p95).toBeGreaterThan(0);
  });

  it("p50 <= p95 <= p99（百分位单调递增）", async () => {
    const result = await measureTypingLatency({ iterations: 20, docSize: 2000 });
    expect(result.p50).toBeLessThanOrEqual(result.p95);
    expect(result.p95).toBeLessThanOrEqual(result.p99);
  });

  it("env.cpu 为非空字符串（AC-004）", async () => {
    const result = await measureTypingLatency({ iterations: 20, docSize: 2000 });
    expect(typeof result.env.cpu).toBe("string");
    expect(result.env.cpu.length).toBeGreaterThan(0);
  });

  it("env.node 为非空字符串（AC-004）", async () => {
    const result = await measureTypingLatency({ iterations: 20, docSize: 2000 });
    expect(typeof result.env.node).toBe("string");
    expect(result.env.node.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC-002: theme-switch benchmark 机制验证（小 iterations，不断言 <200ms）
// ---------------------------------------------------------------------------

describe("measureThemeSwitch: 测量机制可跑通（AC-002）", () => {
  it("返回 samples=5（iterations=5）", async () => {
    const result = await measureThemeSwitch({ iterations: 5 });
    expect(result.samples).toBe(5);
  });

  it("name 字段为 'theme-switch'", async () => {
    const result = await measureThemeSwitch({ iterations: 5 });
    expect(result.name).toBe("theme-switch");
  });

  it("p95 为有限正数（机制验证，不断言 <200ms）", async () => {
    const result = await measureThemeSwitch({ iterations: 5 });
    expect(Number.isFinite(result.p95)).toBe(true);
    expect(result.p95).toBeGreaterThan(0);
  });

  it("p50 <= p95 <= p99（百分位单调递增）", async () => {
    const result = await measureThemeSwitch({ iterations: 5 });
    expect(result.p50).toBeLessThanOrEqual(result.p95);
    expect(result.p95).toBeLessThanOrEqual(result.p99);
  });

  it("env.cpu 为非空字符串（AC-004）", async () => {
    const result = await measureThemeSwitch({ iterations: 5 });
    expect(typeof result.env.cpu).toBe("string");
    expect(result.env.cpu.length).toBeGreaterThan(0);
  });

  it("env.node 为非空字符串（AC-004）", async () => {
    const result = await measureThemeSwitch({ iterations: 5 });
    expect(typeof result.env.node).toBe("string");
    expect(result.env.node.length).toBeGreaterThan(0);
  });
});
