import { beforeEach, describe, expect, it } from "vitest";
import {
  observeFallbackPlatformPatchHits,
  observeRenderMarkdownLatency,
  renderMetrics,
  resetMetrics,
} from "./metrics.ts";

beforeEach(() => {
  resetMetrics();
});

describe("render_markdown_latency_ms", () => {
  it("renderMetrics output contains the metric name and help text after an observation", async () => {
    observeRenderMarkdownLatency(42);
    const text = await renderMetrics();
    expect(text).toContain("# HELP render_markdown_latency_ms");
    expect(text).toContain("render_markdown_latency_ms_count 1");
  });

  it("accumulates multiple observations into the same counter", async () => {
    observeRenderMarkdownLatency(10);
    observeRenderMarkdownLatency(20);
    const text = await renderMetrics();
    expect(text).toContain("render_markdown_latency_ms_count 2");
  });
});

describe("fallback_platform_patch_hits", () => {
  it("renderMetrics output contains the metric name and help text after an observation", async () => {
    observeFallbackPlatformPatchHits(3);
    const text = await renderMetrics();
    expect(text).toContain("# HELP fallback_platform_patch_hits");
    expect(text).toContain("fallback_platform_patch_hits_count 1");
  });
});

describe("resetMetrics", () => {
  it("clears prior observations so counts restart from zero", async () => {
    observeRenderMarkdownLatency(5);
    resetMetrics();
    observeRenderMarkdownLatency(7);
    const text = await renderMetrics();
    expect(text).toContain("render_markdown_latency_ms_count 1");
  });
});
