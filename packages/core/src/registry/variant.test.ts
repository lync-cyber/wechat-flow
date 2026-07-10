import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { registerBlock, resetBlockRegistry } from "./block.ts";
import {
  getBlockBaseStyle,
  listBlockVariants,
  registerVariant,
  resetVariantRegistry,
} from "./variant.ts";

afterEach(() => {
  resetBlockRegistry();
  resetVariantRegistry();
});

describe("getBlockBaseStyle four-step resolution", () => {
  it("step 1: returns blockDef.baseStyle.root when variantId is 'default'", () => {
    registerBlock({
      id: "block-default",
      name: "Block Default",
      category: "text",
      directiveAttrs: z.object({}),
      variants: [],
      baseStyle: { root: { color: "#111111" } },
      slots: ["root"],
    });

    expect(getBlockBaseStyle("block-default", "default")).toEqual({ color: "#111111" });
  });

  it("step 1 priority: 'default' still resolves via blockDef.baseStyle.root even when a builtin variant with baseStyle exists", () => {
    registerBlock({
      id: "block-default-priority",
      name: "Block Default Priority",
      category: "text",
      directiveAttrs: z.object({}),
      variants: [{ id: "highlighted", baseStyle: { root: { color: "#ff0000" } } }],
      baseStyle: { root: { color: "#222222" } },
      slots: ["root"],
    });

    expect(getBlockBaseStyle("block-default-priority", "default")).toEqual({
      color: "#222222",
    });
  });

  it("step 2: returns a builtin (non-default) variant's baseStyle.root when present", () => {
    registerBlock({
      id: "block-builtin-variant",
      name: "Block Builtin Variant",
      category: "emphasis",
      directiveAttrs: z.object({}),
      variants: [{ id: "highlighted", baseStyle: { root: { color: "#ff0000" } } }],
      baseStyle: { root: { color: "#000000" } },
      slots: ["root"],
    });

    expect(getBlockBaseStyle("block-builtin-variant", "highlighted")).toEqual({
      color: "#ff0000",
    });
  });

  it("step 3: falls back to the runtime variant store when the builtin variant has no baseStyle", () => {
    registerBlock({
      id: "block-no-builtin-basestyle",
      name: "Block No Builtin BaseStyle",
      category: "structured",
      directiveAttrs: z.object({}),
      variants: [{ id: "outline" }],
      slots: ["root"],
    });
    registerVariant({
      blockId: "block-no-builtin-basestyle",
      id: "dynamic-variant",
      label: "Dynamic Variant",
      style: { root: { margin: "8px" } },
    });

    expect(getBlockBaseStyle("block-no-builtin-basestyle", "dynamic-variant")).toEqual({
      margin: "8px",
    });
  });

  it("step 3 to step 4: builtin variant with no baseStyle and no matching store entry falls through to {}", () => {
    registerBlock({
      id: "block-no-basestyle-no-store",
      name: "Block No BaseStyle No Store",
      category: "media",
      directiveAttrs: z.object({}),
      variants: [{ id: "plain" }],
      slots: ["root"],
    });

    expect(getBlockBaseStyle("block-no-basestyle-no-store", "plain")).toEqual({});
  });

  it("step 4: returns {} when variantId is neither 'default' nor any builtin variant, and no store entry matches", () => {
    registerBlock({
      id: "block-unknown-variant",
      name: "Block Unknown Variant",
      category: "marketing",
      directiveAttrs: z.object({}),
      variants: [{ id: "known" }],
      slots: ["root"],
    });

    expect(getBlockBaseStyle("block-unknown-variant", "nonexistent")).toEqual({});
  });

  it("step 4: returns {} (not undefined, does not throw) when blockId is not registered at all", () => {
    expect(() => getBlockBaseStyle("no-such-block", "default")).not.toThrow();
    expect(getBlockBaseStyle("no-such-block", "default")).toEqual({});
  });
});

describe("registerVariant 值级 FORBIDDEN 声明校验", () => {
  it("style 含 display:grid 时抛错，rejectedDeclarations 含 forbidden 语义 reason", () => {
    registerBlock({
      id: "block-forbidden-display",
      name: "Block Forbidden Display",
      category: "structured",
      directiveAttrs: z.object({}),
      variants: [],
      slots: ["root"],
    });

    let thrown: unknown;
    try {
      registerVariant({
        blockId: "block-forbidden-display",
        id: "grid-variant",
        label: "Grid",
        style: { root: { display: "grid" } },
      });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeDefined();
    const err = thrown as {
      rejectedDeclarations?: Array<{
        slot: string;
        property: string;
        value: string;
        reason: string;
      }>;
    };
    expect(Array.isArray(err.rejectedDeclarations)).toBe(true);
    const decl = err.rejectedDeclarations?.find((d) => d.property === "display");
    expect(decl?.value).toBe("grid");
    expect(decl?.reason.toLowerCase()).toContain("forbidden");
  });

  it("display:grid 抛错后 listBlockVariants 查不到该 variant（无部分注册）", () => {
    registerBlock({
      id: "block-forbidden-display-2",
      name: "Block Forbidden Display 2",
      category: "structured",
      directiveAttrs: z.object({}),
      variants: [],
      slots: ["root"],
    });

    try {
      registerVariant({
        blockId: "block-forbidden-display-2",
        id: "grid-variant",
        label: "Grid",
        style: { root: { display: "grid" } },
      });
    } catch {
      // expected
    }

    const variants = listBlockVariants("block-forbidden-display-2");
    expect(variants.find((v) => v.id === "grid-variant")).toBeUndefined();
  });
});
