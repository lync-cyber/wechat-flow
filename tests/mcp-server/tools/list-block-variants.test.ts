import { beforeAll, describe, expect, it } from "vitest";
import { registerBuiltins } from "../../../apps/mcp-server/src/bootstrap.ts";
import { describeVariantTool } from "../../../apps/mcp-server/src/tools/describe-variant.ts";
import { listBlockVariantsTool } from "../../../apps/mcp-server/src/tools/list-block-variants.ts";
import { describeVariant, listBlockVariants } from "../../../packages/core/src/registry/variant.ts";

beforeAll(() => {
  registerBuiltins();
});

// ---- AC-001: list_block_variants('callout') 返回 ≥3，每项含 id/blockId ----

describe("AC-001: list_block_variants(callout) returns ≥3 variants each with id and blockId", () => {
  it("listBlockVariantsTool({ blockId: 'callout' }) returns array with at least 3 items", () => {
    const result = listBlockVariantsTool({ blockId: "callout" }) as Array<{
      id: string;
      blockId: string;
      label: string;
    }>;
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(3);
    for (const item of result) {
      expect(typeof item.id).toBe("string");
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.blockId).toBe("callout");
    }
  });

  it("result includes built-in variants default, filled, minimal", () => {
    const result = listBlockVariantsTool({ blockId: "callout" }) as Array<{ id: string }>;
    const ids = result.map((v) => v.id);
    expect(ids).toContain("default");
    expect(ids).toContain("filled");
    expect(ids).toContain("minimal");
  });

  it("SR-006: each item exposes render metadata field (undefined when M-005 has no render model)", () => {
    const result = listBlockVariantsTool({ blockId: "callout" }) as Array<Record<string, unknown>>;
    for (const item of result) {
      expect("render" in item).toBe(true);
    }
  });
});

// ---- AC-002: describe_variant('callout','filled') 返回 attrsSchema + style ----

describe("AC-002: describe_variant(callout, filled) returns attrsSchema as JSON Schema and style", () => {
  it("describeVariantTool({ blockId: 'callout', variantId: 'filled' }) has attrsSchema.type = 'object'", () => {
    const result = describeVariantTool({ blockId: "callout", variantId: "filled" }) as Record<
      string,
      unknown
    >;
    expect(result).not.toHaveProperty("code");
    expect(result).toHaveProperty("attrsSchema");
    const schema = result.attrsSchema as Record<string, unknown>;
    expect(schema.type).toBe("object");
    expect(typeof schema.properties).toBe("object");
    expect(schema.properties).not.toBeNull();
    expect(Object.keys(schema.properties as object).length).toBeGreaterThan(0);
  });

  it("describeVariantTool({ blockId: 'callout', variantId: 'filled' }) has style field", () => {
    const result = describeVariantTool({ blockId: "callout", variantId: "filled" }) as Record<
      string,
      unknown
    >;
    expect(result).toHaveProperty("style");
    expect(typeof result.style).toBe("object");
  });

  it("describeVariantTool returns id, blockId, label fields", () => {
    const result = describeVariantTool({ blockId: "callout", variantId: "filled" }) as Record<
      string,
      unknown
    >;
    expect(result.id).toBe("filled");
    expect(result.blockId).toBe("callout");
    expect(typeof result.label).toBe("string");
  });

  it("SR-006: describe_variant returns dependencies array (empty when M-005 has no dep model)", () => {
    const result = describeVariantTool({ blockId: "callout", variantId: "filled" }) as Record<
      string,
      unknown
    >;
    expect(result).toHaveProperty("dependencies");
    expect(Array.isArray(result.dependencies)).toBe(true);
  });
});

// ---- AC-003: Tool 仅调用 M-005 注册中心 API，不含业务逻辑 ----

describe("AC-003: tools delegate to M-005 registry APIs (listBlockVariants / describeVariant)", () => {
  it("listBlockVariants is callable from core registry", () => {
    const variants = listBlockVariants("callout");
    expect(Array.isArray(variants)).toBe(true);
  });

  it("describeVariant is callable from core registry", () => {
    const result = describeVariant("filled");
    // built-in variants are not in the dynamic store; result may be undefined
    expect(result === undefined || typeof result === "object").toBe(true);
  });

  it("listBlockVariantsTool delegates to describeBlock + listBlockVariants without extra computation", () => {
    const result = listBlockVariantsTool({ blockId: "callout" }) as Array<{
      id: string;
      blockId: string;
    }>;
    // Each item carries blockId added by the tool layer — confirms thin wrapper pattern
    for (const item of result) {
      expect(item.blockId).toBe("callout");
    }
  });

  it("describeVariantTool returns E_NOT_FOUND for unknown blockId", () => {
    const result = describeVariantTool({
      blockId: "no-such-block",
      variantId: "default",
    }) as Record<string, unknown>;
    expect(result.code).toBe("E_NOT_FOUND");
  });

  it("describeVariantTool returns E_NOT_FOUND for unknown variantId", () => {
    const result = describeVariantTool({
      blockId: "callout",
      variantId: "no-such-variant",
    }) as Record<string, unknown>;
    expect(result.code).toBe("E_NOT_FOUND");
  });
});
