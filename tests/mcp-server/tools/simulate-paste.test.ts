import { beforeEach, describe, expect, it } from "vitest";
import { renderMetrics, resetMetrics } from "../../../apps/mcp-server/src/metrics.ts";
import { simulatePasteTool } from "../../../apps/mcp-server/src/tools/simulate-paste.ts";

beforeEach(() => {
  resetMetrics();
});

// AC-003: handler delegates to wechatAdapter.inspect (PatchLog shape) — thin wrapper
describe("AC-003: simulatePasteTool returns patchedHtml, changes and a filteredHtml alias", () => {
  it("returns patchedHtml string, changes array for simple html", () => {
    const result = simulatePasteTool({ html: "<p>hello</p>" }) as Record<string, unknown>;
    expect(typeof result.patchedHtml).toBe("string");
    expect(result.patchedHtml).toContain("hello");
    expect(Array.isArray(result.changes)).toBe(true);
  });

  it("filteredHtml alias equals patchedHtml (transition-window compatibility)", () => {
    const result = simulatePasteTool({ html: "<p>test</p>" }) as Record<string, unknown>;
    expect(result.filteredHtml).toBe(result.patchedHtml);
  });

  it("each change entry has patch/count/samples fields matching PatchChange shape", () => {
    const html = '<div id="x" style="position:fixed;color:red">text</div>';
    const result = simulatePasteTool({ html }) as {
      patchedHtml: string;
      changes: Array<{ patch: string; count: number; samples: Array<{ before: string }> }>;
    };
    for (const change of result.changes) {
      expect(typeof change.patch).toBe("string");
      expect(typeof change.count).toBe("number");
      expect(Array.isArray(change.samples)).toBe(true);
      for (const sample of change.samples) {
        expect(typeof sample.before).toBe("string");
      }
    }
  });
});

// AC-003: tool only delegates to wechatAdapter.inspect (thin wrapper, no extra business logic)
describe("AC-003: simulatePasteTool is a thin wrapper — args.html is passed through to the adapter", () => {
  it("reads html from args.html; unsafe tags stripped from patchedHtml", () => {
    const html = "<style>body{color:red}</style><p>content</p>";
    const result = simulatePasteTool({ html }) as {
      patchedHtml: string;
      changes: Array<{ patch: string }>;
    };
    expect(result.patchedHtml).not.toMatch(/<style[\s>]/i);
    const styleStripped = result.changes.some((c) => c.patch === "strip-tag:style");
    expect(styleStripped).toBe(true);
  });

  it("empty html arg falls back to empty string, not throwing", () => {
    const result = simulatePasteTool({}) as Record<string, unknown>;
    expect(result.patchedHtml).toBe("");
    expect(result.changes).toEqual([]);
  });
});

// AC-004: simulatePasteTool observes fallback_platform_patch_hits per call
describe("AC-004: simulatePasteTool observes fallback_platform_patch_hits on each call", () => {
  it("a single call increments the fallback_platform_patch_hits observation count by 1", async () => {
    simulatePasteTool({ html: '<div id="x">hello</div>' });
    const text = await renderMetrics();
    expect(text).toContain("fallback_platform_patch_hits_count 1");
  });

  it("tool return shape stays { patchedHtml, changes, filteredHtml }", () => {
    const result = simulatePasteTool({ html: '<div id="x">hello</div>' }) as Record<
      string,
      unknown
    >;
    expect(Object.keys(result).sort()).toEqual(["changes", "filteredHtml", "patchedHtml"]);
  });
});
