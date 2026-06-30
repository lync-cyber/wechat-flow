import os from "node:os";
import { performance } from "node:perf_hooks";
import {
  registerTheme,
  renderMarkdown,
  resetThemeRegistry,
} from "../../packages/core/src/index.ts";
import defaultTheme from "../../packages/themes/default/src/index.ts";
import magazineTheme from "../../packages/themes/magazine/src/index.ts";
import { computePercentiles } from "./perf-runner.ts";
import type { BenchResult } from "./perf-runner.ts";

function buildMarkdown(charCount: number): string {
  const paragraph =
    "这是一段用于性能基准测试的示例文本，包含中文字符和标点符号。每个段落约有一百个字符左右用于模拟真实写作场景。\n\n";
  const heading = "## 章节标题\n\n";
  let result = "# 性能基准测试文档\n\n";
  while (result.length < charCount) {
    result += heading + paragraph;
  }
  return result;
}

export async function measureThemeSwitch(opts: { iterations?: number } = {}): Promise<BenchResult> {
  const { iterations = 100 } = opts;

  resetThemeRegistry();
  registerTheme(defaultTheme);
  registerTheme(magazineTheme);

  const md = buildMarkdown(10000);

  // warmup
  await renderMarkdown(md, { themeId: "default" });

  const timings: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const themeId = i % 2 === 0 ? "magazine" : "default";
    const t0 = performance.now();
    await renderMarkdown(md, { themeId });
    timings.push(performance.now() - t0);
  }

  const percs = computePercentiles(timings);

  return {
    name: "theme-switch",
    ...percs,
    samples: iterations,
    env: {
      cpu: os.cpus()[0]?.model ?? "unknown",
      node: process.version,
    },
  };
}
