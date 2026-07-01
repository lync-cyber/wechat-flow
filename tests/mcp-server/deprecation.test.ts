import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkDeprecations,
  clearDeprecations,
  markDeprecated,
} from "../../apps/mcp-server/src/deprecation.ts";
import { createServer } from "../../apps/mcp-server/src/transport/stdio.ts";

beforeEach(() => {
  clearDeprecations();
});

describe("AC-001/AC-002: markDeprecated registers records queryable via checkDeprecations", () => {
  it("registers a record and returns it with toolName/field/since/until intact", () => {
    markDeprecated("legacy_tool", "old_field", "2026-01-01", "2026-06-01");
    const fixedNow = new Date("2026-07-01");

    const warnings = checkDeprecations(fixedNow);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toEqual({
      toolName: "legacy_tool",
      field: "old_field",
      since: "2026-01-01",
      until: "2026-06-01",
      expired: true,
    });
  });

  it("returns one entry per registered record, each with correct expired flag", () => {
    markDeprecated("expired_tool", "field_a", "2026-01-01", "2026-06-01");
    markDeprecated("future_tool", "field_b", "2026-01-01", "2026-12-31");
    const fixedNow = new Date("2026-07-01");

    const warnings = checkDeprecations(fixedNow);

    expect(warnings).toHaveLength(2);
    const byTool = Object.fromEntries(warnings.map((w) => [w.toolName, w]));
    expect(byTool.expired_tool.expired).toBe(true);
    expect(byTool.future_tool.expired).toBe(false);
  });
});

describe("AC-003: expired boundary — strictly greater than until", () => {
  it("expired is false when now equals until exactly", () => {
    markDeprecated("boundary_tool", "field", "2026-01-01", "2026-07-01T00:00:00.000Z");
    const fixedNow = new Date("2026-07-01T00:00:00.000Z");

    const [warning] = checkDeprecations(fixedNow);

    expect(warning.expired).toBe(false);
  });

  it("expired is true when now is one day after until", () => {
    markDeprecated("boundary_tool", "field", "2026-01-01", "2026-06-30T00:00:00.000Z");
    const fixedNow = new Date("2026-07-01T00:00:00.000Z");

    const [warning] = checkDeprecations(fixedNow);

    expect(warning.expired).toBe(true);
  });
});

describe("AC-005: checkDeprecations reflects registry state after registration", () => {
  it("returns empty array when no records are registered", () => {
    expect(checkDeprecations(new Date("2026-07-01"))).toEqual([]);
  });
});

describe("AC-004: createServer warns on expired deprecations at startup", () => {
  it("calls console.warn with toolName/field when an expired record is registered", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    markDeprecated("legacy_tool", "old_field", "2026-01-01", "2026-06-01");

    createServer();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("legacy_tool"));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("old_field"));

    warnSpy.mockRestore();
  });

  it("does not call console.warn when no deprecations are registered", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    createServer();

    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
