import { describe, expect, it } from "vitest";
import { expectTypeOf } from "vitest";
import type { z } from "zod";

// AC-001: renderMarkdownRequestSchema gains customCss field
describe("AC-001: renderMarkdownRequestSchema accepts customCss: string | undefined", () => {
  it("parses with customCss present", async () => {
    const { renderMarkdownRequestSchema } = await import("../../packages/contracts/src/index.ts");
    const result = renderMarkdownRequestSchema.safeParse({
      markdown: "# H",
      customCss: "p { color: red; }",
    });
    expect(result.success).toBe(true);
  });

  it("parses without customCss (field is optional)", async () => {
    const { renderMarkdownRequestSchema } = await import("../../packages/contracts/src/index.ts");
    const result = renderMarkdownRequestSchema.safeParse({ markdown: "# H" });
    expect(result.success).toBe(true);
  });

  it("customCss field is typed as string | undefined in inferred type", async () => {
    const { renderMarkdownRequestSchema } = await import("../../packages/contracts/src/index.ts");
    type Req = z.infer<
      typeof import("../../packages/contracts/src/index.ts")["renderMarkdownRequestSchema"]
    >;
    expectTypeOf<Req["customCss"]>().toEqualTypeOf<string | undefined>();
    // parsed data carries the value through
    const result = renderMarkdownRequestSchema.safeParse({
      markdown: "# H",
      customCss: "p { color: red; }",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customCss).toBe("p { color: red; }");
    }
  });

  it("customCss with undefined value is omitted / success still true", async () => {
    const { renderMarkdownRequestSchema } = await import("../../packages/contracts/src/index.ts");
    const result = renderMarkdownRequestSchema.safeParse({
      markdown: "# H",
      customCss: undefined,
    });
    expect(result.success).toBe(true);
  });
});

// AC-002: registerVariantRequestSchema exists and validates correctly
describe("AC-002: registerVariantRequestSchema parses valid register-variant request", () => {
  it("parses a well-formed register_variant request", async () => {
    const { registerVariantRequestSchema } = await import("../../packages/contracts/src/index.ts");
    const result = registerVariantRequestSchema.safeParse({
      blockId: "callout",
      variantId: "my:dark",
      label: "Dark",
      style: { root: { "background-color": "#000" } },
    });
    expect(result.success).toBe(true);
  });

  it("rejects when blockId is missing", async () => {
    const { registerVariantRequestSchema } = await import("../../packages/contracts/src/index.ts");
    const result = registerVariantRequestSchema.safeParse({
      variantId: "my:dark",
      label: "Dark",
      style: { root: { "background-color": "#000" } },
    });
    expect(result.success).toBe(false);
  });

  it("rejects when style is not a 2-level record", async () => {
    const { registerVariantRequestSchema } = await import("../../packages/contracts/src/index.ts");
    const result = registerVariantRequestSchema.safeParse({
      blockId: "callout",
      variantId: "my:dark",
      label: "Dark",
      style: "not-an-object",
    });
    expect(result.success).toBe(false);
  });

  it("parses style with multiple slots and declarations", async () => {
    const { registerVariantRequestSchema } = await import("../../packages/contracts/src/index.ts");
    const result = registerVariantRequestSchema.safeParse({
      blockId: "callout",
      variantId: "my:dark",
      label: "Dark Callout",
      style: {
        root: { "background-color": "#000", color: "#fff" },
        icon: { color: "#aaa" },
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.blockId).toBe("callout");
      expect(result.data.variantId).toBe("my:dark");
      expect(result.data.style.root["background-color"]).toBe("#000");
    }
  });
});

// AC-003: registerVariantResponseSchema validates rejected declarations
describe("AC-003: registerVariantResponseSchema validates rejected declarations shape", () => {
  it("parses registered=false with non-empty rejectedDeclarations", async () => {
    const { registerVariantResponseSchema } = await import("../../packages/contracts/src/index.ts");
    const result = registerVariantResponseSchema.safeParse({
      registered: false,
      variantId: "my:dark",
      rejectedDeclarations: [
        {
          slot: "root",
          property: "background-color",
          value: "#000",
          reason: "not in whitelist",
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const decl = result.data.rejectedDeclarations[0];
      expect(decl.slot).toBe("root");
      expect(decl.property).toBe("background-color");
      expect(decl.value).toBe("#000");
      expect(decl.reason).toBe("not in whitelist");
    }
  });

  it("parses registered=true with empty rejectedDeclarations", async () => {
    const { registerVariantResponseSchema } = await import("../../packages/contracts/src/index.ts");
    const result = registerVariantResponseSchema.safeParse({
      registered: true,
      variantId: "my:dark",
      rejectedDeclarations: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.registered).toBe(true);
      expect(result.data.rejectedDeclarations).toHaveLength(0);
    }
  });

  it("rejects when a rejectedDeclaration entry is missing the reason field", async () => {
    const { registerVariantResponseSchema } = await import("../../packages/contracts/src/index.ts");
    const result = registerVariantResponseSchema.safeParse({
      registered: false,
      variantId: "my:dark",
      rejectedDeclarations: [
        { slot: "root", property: "background-color", value: "#000" },
        // reason is missing
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects when rejectedDeclarations is missing entirely", async () => {
    const { registerVariantResponseSchema } = await import("../../packages/contracts/src/index.ts");
    const result = registerVariantResponseSchema.safeParse({
      registered: false,
      variantId: "my:dark",
    });
    expect(result.success).toBe(false);
  });
});

// AC-004: themeBlocksSchema is 3-layer (blockName → variantId → prop → value)
describe("AC-004: themeBlocksSchema enforces 3-layer structure (blockName→variantId→prop→value)", () => {
  it("parses 3-layer data with default and named variants", async () => {
    const { themeBlocksSchema } = await import("../../packages/contracts/src/index.ts");
    const result = themeBlocksSchema.safeParse({
      callout: {
        default: { "background-color": "#fff" },
        dark: { "background-color": "#000" },
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.callout.default["background-color"]).toBe("#fff");
      expect(result.data.callout.dark["background-color"]).toBe("#000");
    }
  });

  it("rejects old 2-layer shape where block value is a string record (not a variant→decl map)", async () => {
    const { themeBlocksSchema } = await import("../../packages/contracts/src/index.ts");
    // Old shape: blockName → prop → value  (values at second level are strings, not objects)
    const result = themeBlocksSchema.safeParse({
      callout: { "background-color": "#fff" },
    });
    // In the 3-layer schema, callout's value must be z.record(z.string(), z.record(...))
    // so the inner value "#fff" (a string) must fail
    expect(result.success).toBe(false);
  });

  it("accepts multiple blocks each with a default variant", async () => {
    const { themeBlocksSchema } = await import("../../packages/contracts/src/index.ts");
    const result = themeBlocksSchema.safeParse({
      h1: { default: { "font-size": "22px", color: "#1a1a1a" } },
      p: { default: { "font-size": "15px", color: "#333" } },
      blockquote: { default: { "border-left": "4px solid #e0e0e0" } },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.h1.default["font-size"]).toBe("22px");
      expect(result.data.p.default.color).toBe("#333");
    }
  });

  it("rejects when innermost value is not a string (e.g., a number)", async () => {
    const { themeBlocksSchema } = await import("../../packages/contracts/src/index.ts");
    const result = themeBlocksSchema.safeParse({
      h1: { default: { "font-size": 22 } },
    });
    expect(result.success).toBe(false);
  });
});
