import os from "node:os";
import { performance } from "node:perf_hooks";

export type BenchResult = {
  name: string;
  p50: number;
  p95: number;
  p99: number;
  samples: number;
  env: { cpu: string; node: string };
};

export function computePercentiles(samples: number[]): { p50: number; p95: number; p99: number } {
  if (samples.length === 0) {
    throw new Error("computePercentiles requires a non-empty samples array");
  }
  const sorted = [...samples].sort((a: number, b: number) => a - b);
  const percentile = (p: number): number => {
    const idx = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  return {
    p50: percentile(50),
    p95: percentile(95),
    p99: percentile(99),
  };
}

export async function runBenchmark(
  name: string,
  fn: () => unknown,
  opts: { iterations: number; warmup?: number }
): Promise<BenchResult> {
  const { iterations, warmup = 0 } = opts;
  for (let i = 0; i < warmup; i++) {
    await fn();
  }
  const timings: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    await fn();
    timings.push(performance.now() - t0);
  }
  const percs = computePercentiles(timings);
  return {
    name,
    ...percs,
    samples: iterations,
    env: {
      cpu: os.cpus()[0]?.model ?? "unknown",
      node: process.version,
    },
  };
}

export function checkThresholds(
  results: BenchResult[],
  thresholds: Record<string, number>
): { passed: boolean; breaches: Array<{ name: string; p95: number; limit: number }> } {
  const breaches: Array<{ name: string; p95: number; limit: number }> = [];
  for (const r of results) {
    const limit = thresholds[r.name];
    if (limit !== undefined && r.p95 > limit) {
      breaches.push({ name: r.name, p95: r.p95, limit });
    }
  }
  return { passed: breaches.length === 0, breaches };
}

export function toExitCode(check: { passed: boolean }): number {
  return check.passed ? 0 : 1;
}
