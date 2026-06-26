/**
 * T-048 · M-007 plugin-api surface — light mode tests (RED+GREEN merged).
 * Exercises defineBlock / defineVariant / manifest-check variant mismatch.
 */
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  describeBlock,
  registerBlock,
  resetBlockRegistry,
} from "../../packages/core/src/registry/block.ts";
import {
  listBlockVariants,
  registerVariant,
  resetVariantRegistry,
} from "../../packages/core/src/registry/variant.ts";
import { createPluginSurface } from "../../packages/plugin-api/src/surface/plugin-api.ts";
import {
  E_MANIFEST_VARIANT_MISMATCH,
  checkManifestVariantIntents,
} from "../../packages/plugin-api/src/validation/manifest-check.ts";

// ---------------------------------------------------------------------------
// AC-001 · defineBlock propagates to M-005 block registry
// ---------------------------------------------------------------------------

describe("defineBlock (AC-001)", () => {
  afterEach(() => {
    resetBlockRegistry();
    resetVariantRegistry();
  });

  it("registers a block so describeBlock returns it by id", () => {
    const surface = createPluginSurface({
      registerBlock,
      describeBlock,
      registerVariant,
      listBlockVariants,
    });

    surface.defineBlock({
      id: "my-block",
      name: "My Block",
      attrsSchema: z.object({ title: z.string() }),
      render: () => "<div>hello</div>",
    });

    const found = describeBlock("my-block");
    expect(found).toBeDefined();
    expect(found?.id).toBe("my-block");
    expect(found?.name).toBe("My Block");
  });

  it("registered block includes root slot", () => {
    const surface = createPluginSurface({
      registerBlock,
      describeBlock,
      registerVariant,
      listBlockVariants,
    });

    surface.defineBlock({
      id: "my-block-2",
      name: "Block 2",
      attrsSchema: z.object({}),
      render: () => "<span />",
    });

    const found = describeBlock("my-block-2");
    expect(found?.slots).toContain("root");
  });
});

// ---------------------------------------------------------------------------
// AC-002 · defineVariant propagates to M-005 variant registry
// ---------------------------------------------------------------------------

describe("defineVariant (AC-002)", () => {
  afterEach(() => {
    resetBlockRegistry();
    resetVariantRegistry();
  });

  it("registers a variant so listBlockVariants returns its id", () => {
    const surface = createPluginSurface({
      registerBlock,
      describeBlock,
      registerVariant,
      listBlockVariants,
    });

    registerBlock({
      id: "callout",
      name: "Callout",
      attrsSchema: z.object({}),
      variants: [],
      slots: ["root"],
    });

    surface.defineVariant({
      blockId: "callout",
      id: "my-variant",
      label: "My Variant",
      style: { root: { color: "#333" } },
      render: () => "<blockquote />",
    });

    const variants = listBlockVariants("callout");
    const ids = variants.map((v) => v.id);
    expect(ids).toContain("my-variant");
  });
});

// ---------------------------------------------------------------------------
// AC-003 · manifest-check E_MANIFEST_VARIANT_MISMATCH warning
// ---------------------------------------------------------------------------

describe("checkManifestVariantIntents (AC-003)", () => {
  it("returns no warnings when all intended variants were registered", () => {
    const manifest = {
      id: "plugin-x",
      permissions: {},
      intents: { variants: [{ blockId: "callout", variantId: "my-variant" }] },
    };
    const registered = [{ blockId: "callout", variantId: "my-variant" }];
    const warnings = checkManifestVariantIntents(manifest, registered);
    expect(warnings).toHaveLength(0);
  });

  it("returns E_MANIFEST_VARIANT_MISMATCH for each unregistered variant intent", () => {
    const manifest = {
      id: "plugin-y",
      permissions: {},
      intents: {
        variants: [
          { blockId: "callout", variantId: "missing-variant" },
          { blockId: "callout", variantId: "also-missing" },
        ],
      },
    };
    const registered: Array<{ blockId: string; variantId: string }> = [];
    const warnings = checkManifestVariantIntents(manifest, registered);
    expect(warnings).toHaveLength(2);
    expect(warnings[0].code).toBe(E_MANIFEST_VARIANT_MISMATCH);
    expect(warnings[0].blockId).toBe("callout");
    expect(warnings[0].variantId).toBe("missing-variant");
    expect(warnings[1].code).toBe(E_MANIFEST_VARIANT_MISMATCH);
    expect(warnings[1].variantId).toBe("also-missing");
  });

  it("returns warning only for unregistered intents when some registered", () => {
    const manifest = {
      id: "plugin-z",
      permissions: {},
      intents: {
        variants: [
          { blockId: "callout", variantId: "ok-variant" },
          { blockId: "callout", variantId: "missing-variant" },
        ],
      },
    };
    const registered = [{ blockId: "callout", variantId: "ok-variant" }];
    const warnings = checkManifestVariantIntents(manifest, registered);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].variantId).toBe("missing-variant");
  });

  it("returns no warnings when manifest has no variant intents", () => {
    const manifest = { id: "plugin-w", permissions: {} };
    const warnings = checkManifestVariantIntents(manifest, []);
    expect(warnings).toHaveLength(0);
  });
});
