import { Histogram, Registry } from "prom-client";

const registry = new Registry();

const renderMarkdownLatencyMs = new Histogram({
  name: "render_markdown_latency_ms",
  help: "render_markdown tool execution latency in milliseconds",
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [registry],
});

const pasteSimulationDiffRatio = new Histogram({
  name: "paste_simulation_diff_ratio",
  help: "simulate_paste diffed-node ratio (nodeDiffs.length / sourceNodeCount, capped at 1)",
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 1],
  registers: [registry],
});

export function observeRenderMarkdownLatency(ms: number): void {
  renderMarkdownLatencyMs.observe(ms);
}

export function observePasteSimulationDiffRatio(ratio: number): void {
  pasteSimulationDiffRatio.observe(ratio);
}

export function renderMetrics(): Promise<string> {
  return registry.metrics();
}

export function resetMetrics(): void {
  registry.resetMetrics();
}
