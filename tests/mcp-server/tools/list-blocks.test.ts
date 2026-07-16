import { beforeAll, describe, expect, it } from "vitest";
import { registerBuiltins } from "../../../apps/mcp-server/src/bootstrap.ts";
import { describeBlockTool } from "../../../apps/mcp-server/src/tools/describe-block.ts";
import { listBlocksTool } from "../../../apps/mcp-server/src/tools/list-blocks.ts";

const VALID_CATEGORIES = ["text", "media", "emphasis", "structured", "marketing", "meta"];

beforeAll(() => {
  registerBuiltins();
});

// ---- AC-001: list_blocks → every entry has category ∈ 6-value enum, matches describe_block ----

describe("AC-001: list_blocks entries include category consistent with describe_block", () => {
  it("every block in listBlocksTool result has a category within the 6-value enum", () => {
    const blocks = listBlocksTool({}) as Array<{ id: string; name: string; category?: string }>;
    expect(blocks.length).toBeGreaterThanOrEqual(38);
    for (const block of blocks) {
      expect(VALID_CATEGORIES).toContain(block.category);
    }
  });

  it("category for each block matches describeBlockTool(id).category", () => {
    const blocks = listBlocksTool({}) as Array<{ id: string; category?: string }>;
    for (const block of blocks) {
      const described = describeBlockTool({ blockId: block.id }) as Record<string, unknown>;
      expect(described.category).toBe(block.category);
    }
  });

  it("callout block category is emphasis", () => {
    const blocks = listBlocksTool({}) as Array<{ id: string; category?: string }>;
    const callout = blocks.find((b) => b.id === "callout");
    expect(callout?.category).toBe("emphasis");
  });
});
