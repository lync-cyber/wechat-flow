import { beforeEach, describe, expect, it } from "vitest";
import { renderMetrics, resetMetrics } from "../../../apps/mcp-server/src/metrics.ts";
import { simulatePasteTool } from "../../../apps/mcp-server/src/tools/simulate-paste.ts";

beforeEach(() => {
  resetMetrics();
});

// AC-001: handler returns { filteredHtml, diffNodes, droppedAttrs } with diffNodes mapped from core nodeDiffs
describe("AC-001: simulatePasteTool returns filteredHtml, diffNodes, droppedAttrs", () => {
  it("returns filteredHtml string, diffNodes array, droppedAttrs array for simple html", () => {
    const result = simulatePasteTool({ html: "<p>hello</p>" }) as Record<string, unknown>;
    expect(typeof result.filteredHtml).toBe("string");
    expect(result.filteredHtml).toContain("hello");
    expect(Array.isArray(result.diffNodes)).toBe(true);
    expect(Array.isArray(result.droppedAttrs)).toBe(true);
  });

  it("output field is named diffNodes (not nodeDiffs)", () => {
    const result = simulatePasteTool({ html: "<p>test</p>" }) as Record<string, unknown>;
    expect(result).toHaveProperty("diffNodes");
    expect(result).not.toHaveProperty("nodeDiffs");
  });
});

// AC-002: <style> tag in input → droppedAttrs contains entry with nodeSelector:'style' and attrName:'__tag__'
describe("AC-002: style tag stripped and recorded in droppedAttrs with correct DroppedAttr structure", () => {
  it("droppedAttrs contains { nodeSelector: 'style', attrName: '__tag__' } when input has <style> tag", () => {
    const html = "<p>content</p><style>body { color: red; }</style>";
    const result = simulatePasteTool({ html }) as {
      filteredHtml: string;
      diffNodes: unknown[];
      droppedAttrs: Array<{ nodeSelector: string; attrName: string }>;
    };
    const styleEntry = result.droppedAttrs.find(
      (d) => d.nodeSelector === "style" && d.attrName === "__tag__"
    );
    expect(styleEntry).toBeDefined();
    expect(styleEntry?.nodeSelector).toBe("style");
    expect(styleEntry?.attrName).toBe("__tag__");
  });
});

// AC-003: tool only delegates to simulatePaste from core (thin wrapper, no extra business logic)
describe("AC-003: simulatePasteTool is a thin wrapper — args.html is passed through to core", () => {
  it("reads html from args.html and returns consistent output with no extra transformation", () => {
    const html = '<p id="x">paragraph</p>';
    const result = simulatePasteTool({ html }) as {
      filteredHtml: string;
      diffNodes: unknown[];
      droppedAttrs: Array<{ nodeSelector: string; attrName: string }>;
    };
    // id attr should be stripped by core (DroppedAttr with attrName:'id')
    const idDropped = result.droppedAttrs.find((d) => d.attrName === "id");
    expect(idDropped).toBeDefined();
    // filteredHtml should not contain id attribute
    expect(result.filteredHtml).not.toContain('id="x"');
  });
});

// AC-004: simulatePasteTool observes paste_simulation_diff_ratio; sourceNodeCount stays internal
describe("AC-004: simulatePasteTool observes paste_simulation_diff_ratio on each call", () => {
  it("a single call increments the paste_simulation_diff_ratio observation count by 1", async () => {
    simulatePasteTool({ html: '<div id="x">hello</div>' });
    const text = await renderMetrics();
    expect(text).toContain("paste_simulation_diff_ratio_count 1");
  });

  it("tool return shape stays { filteredHtml, diffNodes, droppedAttrs } — sourceNodeCount not exposed", () => {
    const result = simulatePasteTool({ html: '<div id="x">hello</div>' }) as Record<
      string,
      unknown
    >;
    expect(Object.keys(result).sort()).toEqual(["diffNodes", "droppedAttrs", "filteredHtml"]);
    expect(result).not.toHaveProperty("sourceNodeCount");
  });
});
