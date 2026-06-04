import { describe, expect, it } from "vitest";
import {
  ALL_TOOL_SCHEMAS,
  ASYNC_TOOL_COUNT,
  SYNC_TOOL_COUNT,
  TOTAL_TOOL_COUNT,
} from "../../packages/contracts/src/index.ts";

describe("AC-006: Tool schema count = 23 (19 sync + 4 async)", () => {
  it("ALL_TOOL_SCHEMAS registry has exactly 23 entries", () => {
    const count = Object.keys(ALL_TOOL_SCHEMAS).length;
    expect(count).toBe(23);
  });

  it("SYNC_TOOL_COUNT is 19", () => {
    expect(SYNC_TOOL_COUNT).toBe(19);
  });

  it("ASYNC_TOOL_COUNT is 4", () => {
    expect(ASYNC_TOOL_COUNT).toBe(4);
  });

  it("TOTAL_TOOL_COUNT equals 23", () => {
    expect(TOTAL_TOOL_COUNT).toBe(23);
  });

  it("TOTAL_TOOL_COUNT matches ALL_TOOL_SCHEMAS key count", () => {
    expect(Object.keys(ALL_TOOL_SCHEMAS).length).toBe(TOTAL_TOOL_COUNT);
  });
});
