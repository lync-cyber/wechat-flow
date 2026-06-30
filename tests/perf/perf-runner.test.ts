import { describe, expect, it } from "vitest";
import {
  type BenchResult,
  checkThresholds,
  computePercentiles,
  runBenchmark,
  toExitCode,
} from "./perf-runner.ts";

// ---------------------------------------------------------------------------
// AC-004 + AC-001/002: computePercentiles 对已知样本返回正确百分位
// ---------------------------------------------------------------------------

describe("computePercentiles: 已知样本 1..100 的百分位", () => {
  const samples = Array.from({ length: 100 }, (_, i) => i + 1);

  it("p50 在 [50, 51] 范围内（线性插值 / 最近秩均合规）", () => {
    const result = computePercentiles(samples);
    expect(result.p50).toBeGreaterThanOrEqual(50);
    expect(result.p50).toBeLessThanOrEqual(51);
  });

  it("p95 在 [95, 95.95] 范围内", () => {
    const result = computePercentiles(samples);
    expect(result.p95).toBeGreaterThanOrEqual(95);
    expect(result.p95).toBeLessThanOrEqual(95.95);
  });

  it("p99 在 [99, 99.99] 范围内", () => {
    const result = computePercentiles(samples);
    expect(result.p99).toBeGreaterThanOrEqual(99);
    expect(result.p99).toBeLessThanOrEqual(99.99);
  });

  it("p50 <= p95 <= p99（单调递增不变量）", () => {
    const result = computePercentiles(samples);
    expect(result.p50).toBeLessThanOrEqual(result.p95);
    expect(result.p95).toBeLessThanOrEqual(result.p99);
  });
});

describe("computePercentiles: 单元素数组", () => {
  it("单元素 [42]：p50 / p95 / p99 均为 42", () => {
    const result = computePercentiles([42]);
    expect(result.p50).toBe(42);
    expect(result.p95).toBe(42);
    expect(result.p99).toBe(42);
  });
});

describe("computePercentiles: 空数组行为", () => {
  it("空数组抛出错误或返回全 0（测试契约定义：抛错）", () => {
    // 契约：空数组抛错
    expect(() => computePercentiles([])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// AC-004 + AC-001/002: runBenchmark 返回 BenchResult 含正确字段
// ---------------------------------------------------------------------------

describe("runBenchmark: 返回 BenchResult 字段完整性与约束", () => {
  it("samples 字段等于 iterations（20次）", async () => {
    const result = await runBenchmark("test-bench", () => {}, { iterations: 20 });
    expect(result.samples).toBe(20);
  });

  it("name 字段与传入 name 一致", async () => {
    const result = await runBenchmark("my-benchmark", () => {}, { iterations: 5 });
    expect(result.name).toBe("my-benchmark");
  });

  it("env.cpu 为非空字符串（AC-004）", async () => {
    const result = await runBenchmark("env-test", () => {}, { iterations: 3 });
    expect(typeof result.env.cpu).toBe("string");
    expect(result.env.cpu.length).toBeGreaterThan(0);
  });

  it("env.node 为非空字符串（AC-004）", async () => {
    const result = await runBenchmark("env-test", () => {}, { iterations: 3 });
    expect(typeof result.env.node).toBe("string");
    expect(result.env.node.length).toBeGreaterThan(0);
  });

  it("p50 <= p95 <= p99（百分位单调递增，AC-004）", async () => {
    const result = await runBenchmark("monotone-test", () => {}, { iterations: 10 });
    expect(result.p50).toBeLessThanOrEqual(result.p95);
    expect(result.p95).toBeLessThanOrEqual(result.p99);
  });

  it("warmup 次数不计入 samples（warmup=5，iterations=10 → samples=10）", async () => {
    const result = await runBenchmark("warmup-test", () => {}, {
      iterations: 10,
      warmup: 5,
    });
    expect(result.samples).toBe(10);
  });

  it("p95 为有限正数（非 NaN / 非 Infinity）", async () => {
    const result = await runBenchmark("finite-test", () => {}, { iterations: 5 });
    expect(Number.isFinite(result.p95)).toBe(true);
    expect(result.p95).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// AC-003: checkThresholds 超阈值 → passed:false + breaches 非空
// ---------------------------------------------------------------------------

describe("checkThresholds: p95 超阈值时 passed=false 且记入 breaches", () => {
  const overLimit: BenchResult = {
    name: "typing-latency",
    p50: 30,
    p95: 80,
    p99: 100,
    samples: 1000,
    env: { cpu: "test-cpu", node: "22.0.0" },
  };

  it("p95=80 > limit=50 → passed===false", () => {
    const check = checkThresholds([overLimit], { "typing-latency": 50 });
    expect(check.passed).toBe(false);
  });

  it("p95=80 > limit=50 → breaches 含该条目", () => {
    const check = checkThresholds([overLimit], { "typing-latency": 50 });
    expect(check.breaches.length).toBeGreaterThan(0);
  });

  it("breaches[0].name 等于 'typing-latency'", () => {
    const check = checkThresholds([overLimit], { "typing-latency": 50 });
    expect(check.breaches[0].name).toBe("typing-latency");
  });

  it("breaches[0].p95 等于 80（实测值）", () => {
    const check = checkThresholds([overLimit], { "typing-latency": 50 });
    expect(check.breaches[0].p95).toBe(80);
  });

  it("breaches[0].limit 等于 50（阈值）", () => {
    const check = checkThresholds([overLimit], { "typing-latency": 50 });
    expect(check.breaches[0].limit).toBe(50);
  });
});

describe("checkThresholds: p95 未超阈值时 passed=true 且 breaches 为空", () => {
  const underLimit: BenchResult = {
    name: "theme-switch",
    p50: 50,
    p95: 150,
    p99: 180,
    samples: 100,
    env: { cpu: "test-cpu", node: "22.0.0" },
  };

  it("p95=150 <= limit=200 → passed===true", () => {
    const check = checkThresholds([underLimit], { "theme-switch": 200 });
    expect(check.passed).toBe(true);
  });

  it("p95=150 <= limit=200 → breaches 为空数组", () => {
    const check = checkThresholds([underLimit], { "theme-switch": 200 });
    expect(check.breaches).toHaveLength(0);
  });
});

describe("checkThresholds: 多条结果混合——一超一未超", () => {
  const results: BenchResult[] = [
    {
      name: "typing-latency",
      p50: 30,
      p95: 80,
      p99: 95,
      samples: 1000,
      env: { cpu: "cpu", node: "22" },
    },
    {
      name: "theme-switch",
      p50: 50,
      p95: 150,
      p99: 180,
      samples: 100,
      env: { cpu: "cpu", node: "22" },
    },
  ];

  it("任一超限 → passed===false", () => {
    const check = checkThresholds(results, { "typing-latency": 50, "theme-switch": 200 });
    expect(check.passed).toBe(false);
  });

  it("breaches 仅含超限的 typing-latency，不含 theme-switch", () => {
    const check = checkThresholds(results, { "typing-latency": 50, "theme-switch": 200 });
    const names = check.breaches.map((b: { name: string; p95: number; limit: number }) => b.name);
    expect(names).toContain("typing-latency");
    expect(names).not.toContain("theme-switch");
  });
});

// ---------------------------------------------------------------------------
// AC-003: toExitCode 映射 passed→0, !passed→1
// ---------------------------------------------------------------------------

describe("toExitCode: passed 映射到正确退出码", () => {
  it("passed=true → exitCode=0", () => {
    expect(toExitCode({ passed: true })).toBe(0);
  });

  it("passed=false → exitCode=1", () => {
    expect(toExitCode({ passed: false })).toBe(1);
  });
});
