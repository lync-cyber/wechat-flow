import { Histogram, Registry } from "prom-client";

const registry = new Registry();

const renderMarkdownLatencyMs = new Histogram({
  name: "render_markdown_latency_ms",
  help: "render_markdown tool execution latency in milliseconds",
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [registry],
});

const fallbackPlatformPatchHits = new Histogram({
  name: "fallback_platform_patch_hits",
  help: "simulate_paste output-rule patch hit count per wechatAdapter.inspect() call",
  buckets: [0, 1, 2, 5, 10, 25, 50],
  registers: [registry],
});

export function observeRenderMarkdownLatency(ms: number): void {
  renderMarkdownLatencyMs.observe(ms);
}

export function observeFallbackPlatformPatchHits(count: number): void {
  fallbackPlatformPatchHits.observe(count);
}

export function renderMetrics(): Promise<string> {
  return registry.metrics();
}

export function resetMetrics(): void {
  registry.resetMetrics();
}
