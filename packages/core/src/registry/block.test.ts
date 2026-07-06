import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  type BlockCategory,
  type BlockDefinition,
  type BlockVariant,
  registerBlock,
  resetBlockRegistry,
} from "./block.ts";

afterEach(() => {
  resetBlockRegistry();
});

describe("BlockDefinition.category", () => {
  it("accepts each literal value of BlockCategory without a type error", () => {
    const categories: BlockCategory[] = [
      "text",
      "media",
      "emphasis",
      "structured",
      "marketing",
      "meta",
    ];
    for (const category of categories) {
      const definition: BlockDefinition = {
        id: `block-${category}`,
        name: `Block ${category}`,
        category,
        attrsSchema: z.object({}),
        variants: [],
        slots: ["root"],
      };
      registerBlock(definition);
      expect(definition.category).toBe(category);
    }
  });

  it("rejects a BlockDefinition literal missing category at compile time", () => {
    // @ts-expect-error category is required and must not be omitted
    const definition: BlockDefinition = {
      id: "block-no-category",
      name: "Block No Category",
      attrsSchema: z.object({}),
      variants: [],
      slots: ["root"],
    };
    expect(definition).toBeDefined();
  });

  it("rejects an arbitrary string literal assigned to category at compile time", () => {
    // @ts-expect-error "unknown-category" is not a member of BlockCategory
    const category: BlockCategory = "unknown-category";
    expect(category).toBeDefined();
  });
});

describe("BlockVariant.baseStyle", () => {
  it("defaults to undefined when omitted", () => {
    const variant: BlockVariant = { id: "default" };
    expect(variant.baseStyle).toBeUndefined();
  });

  it("carries slot -> cssProp -> cssValue map when provided", () => {
    const variant: BlockVariant = {
      id: "highlighted",
      baseStyle: { root: { color: "#ff0000" } },
    };
    expect(variant.baseStyle?.root.color).toBe("#ff0000");
  });
});

describe("registerBlock root slot validation (regression)", () => {
  it("throws when baseStyle is present but missing the root slot", () => {
    const definition: BlockDefinition = {
      id: "block-bad-basestyle",
      name: "Block Bad BaseStyle",
      category: "text",
      attrsSchema: z.object({}),
      variants: [],
      baseStyle: { header: { color: "#000000" } },
      slots: ["root", "header"],
    };
    expect(() => registerBlock(definition)).toThrow(/root/);
  });

  it("throws when slots is missing root", () => {
    const definition: BlockDefinition = {
      id: "block-bad-slots",
      name: "Block Bad Slots",
      category: "text",
      attrsSchema: z.object({}),
      variants: [],
      slots: ["header"],
    };
    expect(() => registerBlock(definition)).toThrow(/root/);
  });

  it("registers successfully when baseStyle and slots both contain root", () => {
    const definition: BlockDefinition = {
      id: "block-good",
      name: "Block Good",
      category: "media",
      attrsSchema: z.object({}),
      variants: [],
      baseStyle: { root: { color: "#111111" } },
      slots: ["root"],
    };
    expect(() => registerBlock(definition)).not.toThrow();
  });
});
