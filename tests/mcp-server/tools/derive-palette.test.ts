import { describe, expect, it } from "vitest";
import { derivePaletteTool } from "../../../apps/mcp-server/src/tools/derive-palette.ts";
import { derivePalette, meetsWcagAA } from "../../../packages/palette/src/index.ts";

const PRIMARY = "#a8322a";

describe("AC-001: derive_palette returns TokenDictionary covering ≥4 token categories", () => {
  it("result is a plain object with background, accent, status, and decoration keys", () => {
    const result = derivePaletteTool({ primary: PRIMARY }) as Record<string, string>;

    expect(typeof result).toBe("object");
    expect(result).not.toBeNull();

    // background category
    expect(typeof result["--color-surface"]).toBe("string");
    expect(result["--color-surface"].length).toBeGreaterThan(0);

    // accent category
    expect(typeof result["--color-accent"]).toBe("string");
    expect(result["--color-accent"].length).toBeGreaterThan(0);

    // status category (4 status tokens)
    expect(typeof result["--color-status-success"]).toBe("string");
    expect(result["--color-status-success"].length).toBeGreaterThan(0);
    expect(typeof result["--color-status-error"]).toBe("string");
    expect(result["--color-status-error"].length).toBeGreaterThan(0);

    // decoration/border category
    expect(typeof result["--color-border-default"]).toBe("string");
    expect(result["--color-border-default"].length).toBeGreaterThan(0);
  });
});

describe("AC-002: derived tokens pass WCAG AA contrast check", () => {
  it("text-primary on surface meets WCAG AA (≥4.5:1)", () => {
    const result = derivePaletteTool({ primary: PRIMARY }) as Record<string, string>;
    const fg = result["--color-text-primary"];
    const bg = result["--color-surface"];
    expect(meetsWcagAA(fg, bg)).toBe(true);
  });

  it("text-inverse on brand-dark meets WCAG AA (≥4.5:1)", () => {
    const result = derivePaletteTool({ primary: PRIMARY }) as Record<string, string>;
    const fg = result["--color-text-inverse"];
    const bg = result["--color-brand-dark"];
    expect(meetsWcagAA(fg, bg)).toBe(true);
  });
});

describe("invalid input: derivePaletteTool degrades gracefully instead of throwing", () => {
  it("missing primary → E_INVALID_INPUT (no throw)", () => {
    const r = derivePaletteTool({}) as Record<string, unknown>;
    expect(r.code).toBe("E_INVALID_INPUT");
  });

  it("unparseable primary color → E_INVALID_INPUT (no throw)", () => {
    const r = derivePaletteTool({ primary: "not-a-color" }) as Record<string, unknown>;
    expect(r.code).toBe("E_INVALID_INPUT");
  });
});

describe("AC-003: derivePaletteTool delegates entirely to @wechat-flow/palette, no inlined business logic", () => {
  it("output matches derivePalette(seed) directly — same keys and values", () => {
    const expected = derivePalette({ primary: PRIMARY });
    const actual = derivePaletteTool({ primary: PRIMARY }) as Record<string, string>;
    expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
    for (const key of Object.keys(expected)) {
      expect(actual[key]).toBe(expected[key]);
    }
  });
});
