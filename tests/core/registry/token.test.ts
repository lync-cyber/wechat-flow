import { beforeEach, describe, expect, it } from "vitest";
import { listTokensResponseSchema } from "../../../packages/contracts/src/mcp/tool-contracts.ts";
import {
  describeToken,
  listTokens,
  registerToken,
  resetTokenRegistry,
  seedTokenRegistry,
} from "../../../packages/core/src/registry/token.ts";

beforeEach(() => {
  resetTokenRegistry();
  seedTokenRegistry();
});

// ---------------------------------------------------------------------------
// AC-001: TokenDefinition shape
// ---------------------------------------------------------------------------
describe("AC-001: TokenDefinition shape", () => {
  it("registerToken accepts an object with id, category, and value fields", () => {
    // If the new shape is not implemented, TypeScript will error / runtime call will fail or
    // the old shape with 'name' will be used and the stored entry won't have 'id'.
    registerToken({ id: "color.brand", category: "color", value: "#2D5A4E" });
    const token = describeToken("color.brand");
    expect(token?.id).toBe("color.brand");
    expect(token?.category).toBe("color");
    expect(token?.value).toBe("#2D5A4E");
  });

  it("registerToken stores optional themeOverrides when provided", () => {
    registerToken({
      id: "color.brand.override-test",
      category: "color",
      value: "#2D5A4E",
      themeOverrides: { magazine: "#3A7A6E" },
    });
    const token = describeToken("color.brand.override-test");
    expect(token?.themeOverrides).toEqual({ magazine: "#3A7A6E" });
  });

  it("registerToken stores token with no themeOverrides (field absent)", () => {
    registerToken({ id: "spacing.test-unit", category: "spacing", value: "4px" });
    const token = describeToken("spacing.test-unit");
    // Token must be found (not undefined) — confirms id-based lookup works
    expect(token?.id).toBe("spacing.test-unit");
    expect(token?.value).toBe("4px");
    expect(token?.themeOverrides).toBeUndefined();
  });

  it("category must be one of the five canonical categories", () => {
    const validCategories = ["color", "spacing", "font", "decoration", "alignment"] as const;
    for (const cat of validCategories) {
      registerToken({ id: `${cat}.shape-test`, category: cat, value: "x" });
      const t = describeToken(`${cat}.shape-test`);
      expect(t?.category).toBe(cat);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-002: listTokens() returns ≥60 seeded tokens across five categories
// ---------------------------------------------------------------------------
describe("AC-002: listTokens returns ≥60 seeded tokens across all five categories", () => {
  it("returns at least 60 tokens in total", () => {
    const tokens = listTokens();
    expect(tokens.length).toBeGreaterThanOrEqual(60);
  });

  it("contains tokens from all five categories", () => {
    const tokens = listTokens();
    const categories = new Set(tokens.map((t) => t.category));
    expect(categories.has("color")).toBe(true);
    expect(categories.has("font")).toBe(true);
    expect(categories.has("spacing")).toBe(true);
    expect(categories.has("decoration")).toBe(true);
    expect(categories.has("alignment")).toBe(true);
  });

  it("each of the ≥60 seeded tokens has non-empty id, category, and value", () => {
    const tokens = listTokens();
    // Store must be non-empty (seed must have run) — not a vacuous loop
    expect(tokens.length).toBeGreaterThanOrEqual(60);
    for (const t of tokens) {
      expect(t.id.length).toBeGreaterThan(0);
      expect(typeof t.category).toBe("string");
      expect(t.value.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-003: describeToken returns exact token value for known tokens (from ui-spec §1)
// ---------------------------------------------------------------------------
describe("AC-003: describeToken returns literal value for seeded tokens", () => {
  it("color.brand resolves to #2D5A4E (ui-spec §1.1.4)", () => {
    const token = describeToken("color.brand");
    expect(token?.id).toBe("color.brand");
    expect(token?.category).toBe("color");
    expect(token?.value).toBe("#2D5A4E");
  });

  it("color.surface resolves to #FAF8F5 (ui-spec §1.1.1)", () => {
    const token = describeToken("color.surface");
    expect(token?.id).toBe("color.surface");
    expect(token?.category).toBe("color");
    expect(token?.value).toBe("#FAF8F5");
  });

  it("color.text-primary resolves to #1C1917 (ui-spec §1.1.3)", () => {
    const token = describeToken("color.text-primary");
    expect(token?.id).toBe("color.text-primary");
    expect(token?.category).toBe("color");
    expect(token?.value).toBe("#1C1917");
  });

  it("color.border resolves to #D9D4CB (ui-spec §1.1.2)", () => {
    const token = describeToken("color.border");
    expect(token?.id).toBe("color.border");
    expect(token?.category).toBe("color");
    expect(token?.value).toBe("#D9D4CB");
  });

  it("color.accent resolves to #B94A3E (ui-spec §1.1.5)", () => {
    const token = describeToken("color.accent");
    expect(token?.id).toBe("color.accent");
    expect(token?.category).toBe("color");
    expect(token?.value).toBe("#B94A3E");
  });

  it("color.error resolves to #B94A3E (ui-spec §1.1.6)", () => {
    const token = describeToken("color.error");
    expect(token?.id).toBe("color.error");
    expect(token?.category).toBe("color");
    expect(token?.value).toBe("#B94A3E");
  });

  it("color.success resolves to #3A6B49 (ui-spec §1.1.6)", () => {
    const token = describeToken("color.success");
    expect(token?.id).toBe("color.success");
    expect(token?.category).toBe("color");
    expect(token?.value).toBe("#3A6B49");
  });

  it("font.size-base resolves to 15px (ui-spec §1.2.2)", () => {
    const token = describeToken("font.size-base");
    expect(token?.id).toBe("font.size-base");
    expect(token?.category).toBe("font");
    expect(token?.value).toBe("15px");
  });

  it("font.size-md resolves to 16px (ui-spec §1.2.2)", () => {
    const token = describeToken("font.size-md");
    expect(token?.id).toBe("font.size-md");
    expect(token?.category).toBe("font");
    expect(token?.value).toBe("16px");
  });

  it("font.weight-normal resolves to 400 (ui-spec §1.2.4)", () => {
    const token = describeToken("font.weight-normal");
    expect(token?.id).toBe("font.weight-normal");
    expect(token?.category).toBe("font");
    expect(token?.value).toBe("400");
  });

  it("font.line-height-base resolves to 1.6 (ui-spec §1.2.3)", () => {
    const token = describeToken("font.line-height-base");
    expect(token?.id).toBe("font.line-height-base");
    expect(token?.category).toBe("font");
    expect(token?.value).toBe("1.6");
  });

  it("spacing.space-4 resolves to 16px (ui-spec §1.3.1)", () => {
    const token = describeToken("spacing.space-4");
    expect(token?.id).toBe("spacing.space-4");
    expect(token?.category).toBe("spacing");
    expect(token?.value).toBe("16px");
  });

  it("spacing.space-1 resolves to 4px (ui-spec §1.3.1)", () => {
    const token = describeToken("spacing.space-1");
    expect(token?.id).toBe("spacing.space-1");
    expect(token?.category).toBe("spacing");
    expect(token?.value).toBe("4px");
  });

  it("spacing.radius-base resolves to 4px (ui-spec §1.3.2)", () => {
    const token = describeToken("spacing.radius-base");
    expect(token?.id).toBe("spacing.radius-base");
    expect(token?.category).toBe("spacing");
    expect(token?.value).toBe("4px");
  });

  it("decoration.shadow-sm resolves to correct shadow value (ui-spec §1.4)", () => {
    const token = describeToken("decoration.shadow-sm");
    expect(token?.id).toBe("decoration.shadow-sm");
    expect(token?.category).toBe("decoration");
    expect(token?.value).toBe("0 1px 3px rgba(28,25,23,0.08)");
  });

  it("decoration.z-modal resolves to 300 (ui-spec §1.4)", () => {
    const token = describeToken("decoration.z-modal");
    expect(token?.id).toBe("decoration.z-modal");
    expect(token?.category).toBe("decoration");
    expect(token?.value).toBe("300");
  });

  it("alignment.bp-tablet resolves to 768px (ui-spec §1.6)", () => {
    const token = describeToken("alignment.bp-tablet");
    expect(token?.id).toBe("alignment.bp-tablet");
    expect(token?.category).toBe("alignment");
    expect(token?.value).toBe("768px");
  });

  it("alignment.bp-desktop resolves to 1280px (ui-spec §1.6)", () => {
    const token = describeToken("alignment.bp-desktop");
    expect(token?.id).toBe("alignment.bp-desktop");
    expect(token?.category).toBe("alignment");
    expect(token?.value).toBe("1280px");
  });

  it("returns undefined for unknown token id", () => {
    const token = describeToken("no.such.token");
    expect(token).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AC-004: per-category minimum counts
// ---------------------------------------------------------------------------
describe("AC-004: per-category token counts meet minimums", () => {
  it("color category has ≥20 tokens", () => {
    const tokens = listTokens();
    const colorTokens = tokens.filter((t) => t.category === "color");
    expect(colorTokens.length).toBeGreaterThanOrEqual(20);
  });

  it("font category has ≥14 tokens", () => {
    const tokens = listTokens();
    const fontTokens = tokens.filter((t) => t.category === "font");
    expect(fontTokens.length).toBeGreaterThanOrEqual(14);
  });

  it("spacing category has ≥8 tokens", () => {
    const tokens = listTokens();
    const spacingTokens = tokens.filter((t) => t.category === "spacing");
    expect(spacingTokens.length).toBeGreaterThanOrEqual(8);
  });

  it("decoration category has ≥12 tokens", () => {
    const tokens = listTokens();
    const decorationTokens = tokens.filter((t) => t.category === "decoration");
    expect(decorationTokens.length).toBeGreaterThanOrEqual(12);
  });

  it("color tokens include surface, border, text, brand, accent, functional, and diagnostic groups", () => {
    const tokens = listTokens();
    const colorIds = new Set(tokens.filter((t) => t.category === "color").map((t) => t.id));
    // Surface group (ui-spec §1.1.1)
    expect(colorIds.has("color.surface")).toBe(true);
    expect(colorIds.has("color.surface-elevated")).toBe(true);
    // Border group (ui-spec §1.1.2)
    expect(colorIds.has("color.border")).toBe(true);
    // Text group (ui-spec §1.1.3)
    expect(colorIds.has("color.text-primary")).toBe(true);
    expect(colorIds.has("color.text-secondary")).toBe(true);
    // Brand group (ui-spec §1.1.4)
    expect(colorIds.has("color.brand")).toBe(true);
    expect(colorIds.has("color.brand-hover")).toBe(true);
    // Accent group (ui-spec §1.1.5)
    expect(colorIds.has("color.accent")).toBe(true);
    // Functional group (ui-spec §1.1.6)
    expect(colorIds.has("color.success")).toBe(true);
    expect(colorIds.has("color.error")).toBe(true);
  });

  it("font tokens include size, weight, and line-height groups", () => {
    const tokens = listTokens();
    const fontIds = new Set(tokens.filter((t) => t.category === "font").map((t) => t.id));
    // Size group (ui-spec §1.2.2)
    expect(fontIds.has("font.size-base")).toBe(true);
    expect(fontIds.has("font.size-xs")).toBe(true);
    // Line height group (ui-spec §1.2.3)
    expect(fontIds.has("font.line-height-base")).toBe(true);
    // Weight group (ui-spec §1.2.4)
    expect(fontIds.has("font.weight-normal")).toBe(true);
    expect(fontIds.has("font.weight-bold")).toBe(true);
  });

  it("spacing tokens include space scale and radius tokens", () => {
    const tokens = listTokens();
    const spacingIds = new Set(tokens.filter((t) => t.category === "spacing").map((t) => t.id));
    // Space scale (ui-spec §1.3.1)
    expect(spacingIds.has("spacing.space-1")).toBe(true);
    expect(spacingIds.has("spacing.space-4")).toBe(true);
    // Radius scale (ui-spec §1.3.2)
    expect(spacingIds.has("spacing.radius-base")).toBe(true);
    expect(spacingIds.has("spacing.radius-lg")).toBe(true);
  });

  it("decoration tokens include shadow and z-index tokens", () => {
    const tokens = listTokens();
    const decorationIds = new Set(
      tokens.filter((t) => t.category === "decoration").map((t) => t.id)
    );
    // Shadow tokens (ui-spec §1.4)
    expect(decorationIds.has("decoration.shadow-sm")).toBe(true);
    expect(decorationIds.has("decoration.shadow-base")).toBe(true);
    // Z-index tokens (ui-spec §1.4)
    expect(decorationIds.has("decoration.z-toolbar")).toBe(true);
    expect(decorationIds.has("decoration.z-modal")).toBe(true);
    expect(decorationIds.has("decoration.z-toast")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-005: alignment category — breakpoint tokens from ui-spec §1.6
// ---------------------------------------------------------------------------
describe("AC-005: alignment category has ≥2 breakpoint tokens", () => {
  it("alignment category has at least 2 tokens", () => {
    const tokens = listTokens();
    const alignmentTokens = tokens.filter((t) => t.category === "alignment");
    expect(alignmentTokens.length).toBeGreaterThanOrEqual(2);
  });

  it("alignment includes bp-tablet (768px) and bp-desktop (1280px) from ui-spec §1.6", () => {
    const tokens = listTokens();
    const alignmentTokens = tokens.filter((t) => t.category === "alignment");
    const bpTablet = alignmentTokens.find((t) => t.id === "alignment.bp-tablet");
    const bpDesktop = alignmentTokens.find((t) => t.id === "alignment.bp-desktop");
    expect(bpTablet?.value).toBe("768px");
    expect(bpDesktop?.value).toBe("1280px");
  });
});

// ---------------------------------------------------------------------------
// AC-006: @wechat-flow/core public exports are callable
// ---------------------------------------------------------------------------
describe("AC-006: registerToken / listTokens / describeToken are exported from core index", () => {
  it("registerToken exported from core index is a function", async () => {
    const coreModule = await import("../../../packages/core/src/index.ts");
    // Validate callable by calling with a known-valid token
    coreModule.registerToken({ id: "color.ac006-probe", category: "color", value: "#000000" });
    const found = coreModule.describeToken("color.ac006-probe");
    expect(found?.id).toBe("color.ac006-probe");
    expect(found?.value).toBe("#000000");
  });

  it("listTokens exported from core index returns an array with ≥60 entries", async () => {
    const coreModule = await import("../../../packages/core/src/index.ts");
    const tokens = coreModule.listTokens();
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toBeGreaterThanOrEqual(60);
  });

  it("describeToken exported from core index returns undefined for missing token", async () => {
    const coreModule = await import("../../../packages/core/src/index.ts");
    const result = coreModule.describeToken("does.not.exist.ac006");
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AC-007: listTokensResponseSchema validates correctly-shaped token payloads
// ---------------------------------------------------------------------------
describe("AC-007: listTokensResponseSchema validates structured token response", () => {
  it("validates a payload with a single valid token entry as success=true", () => {
    const result = listTokensResponseSchema.safeParse({
      tokens: [{ id: "color.brand", category: "color", value: "#2D5A4E" }],
    });
    expect(result.success).toBe(true);
    // Also verify parsed data contains the token (not just accepts anything)
    if (result.success) {
      const parsed = result.data as {
        tokens: Array<{ id: string; category: string; value: string }>;
      };
      expect(parsed.tokens[0].id).toBe("color.brand");
      expect(parsed.tokens[0].value).toBe("#2D5A4E");
    }
  });

  it("validates a payload with multiple token entries across categories", () => {
    const result = listTokensResponseSchema.safeParse({
      tokens: [
        { id: "color.brand", category: "color", value: "#2D5A4E" },
        { id: "font.size-base", category: "font", value: "15px" },
        { id: "spacing.space-4", category: "spacing", value: "16px" },
        {
          id: "decoration.shadow-sm",
          category: "decoration",
          value: "0 1px 3px rgba(28,25,23,0.08)",
        },
        { id: "alignment.bp-tablet", category: "alignment", value: "768px" },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const parsed = result.data as { tokens: Array<{ id: string }> };
      expect(parsed.tokens.length).toBe(5);
      expect(parsed.tokens[1].id).toBe("font.size-base");
    }
  });

  it("rejects a payload where tokens is missing", () => {
    const result = listTokensResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a payload where a token entry is missing the id field", () => {
    const result = listTokensResponseSchema.safeParse({
      tokens: [{ category: "color", value: "#2D5A4E" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a payload where a token entry is missing the value field", () => {
    const result = listTokensResponseSchema.safeParse({
      tokens: [{ id: "color.brand", category: "color" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a payload where category is not one of the five canonical values", () => {
    const result = listTokensResponseSchema.safeParse({
      tokens: [{ id: "color.brand", category: "unknown-category", value: "#2D5A4E" }],
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC-008: no regression — existing token registry call-sites use new shape
// The old shape had `name` / `description` / `defaultValue`.
// After migration, `describeToken` must be keyed by `id` (not `name`).
// ---------------------------------------------------------------------------
describe("AC-008: migration from name to id — no old-shape artifacts", () => {
  it("describeToken lookup key is id, not name", () => {
    registerToken({ id: "color.migration-probe", category: "color", value: "#FFFFFF" });
    // Old api: store.get(definition.name) — if name is used, this would be undefined
    // New api: store.get(definition.id) — must return the token
    const found = describeToken("color.migration-probe");
    expect(found?.id).toBe("color.migration-probe");
    expect(found?.value).toBe("#FFFFFF");
  });

  it("TokenDefinition no longer has a top-level 'name' string field separate from id", () => {
    registerToken({ id: "color.shape-check", category: "color", value: "#AABBCC" });
    const found = describeToken("color.shape-check");
    // The new definition must have `id` but NOT a legacy top-level `name` field
    // (the `name` field from old TokenDefinition should be gone)
    expect(found).toHaveProperty("id");
    expect(found).not.toHaveProperty("name");
  });

  it("TokenDefinition no longer has a defaultValue field", () => {
    registerToken({ id: "color.old-shape-check", category: "color", value: "#112233" });
    const found = describeToken("color.old-shape-check");
    expect(found).not.toHaveProperty("defaultValue");
  });

  it("listTokens returns ≥60 seeded entries all having id field, not name field", () => {
    const tokens = listTokens();
    // Seeded store must be non-empty — prevents vacuous loop
    expect(tokens.length).toBeGreaterThanOrEqual(60);
    for (const t of tokens) {
      expect(t).toHaveProperty("id");
      expect(t).not.toHaveProperty("name");
    }
  });
});
