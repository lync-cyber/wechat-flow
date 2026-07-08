import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createPluginSurface } from "./plugin-api.ts";
import type { BlockRegistryEntry } from "./plugin-api.ts";

describe("AC-002: defineBlock 注册进 core registry 的条目不含结构化 schema", () => {
  it("registry.registerBlock 收到的条目不携带 attrsSchema 字段", () => {
    let received: Record<string, unknown> | undefined;
    const registerBlockSpy = (def: BlockRegistryEntry): void => {
      received = def as unknown as Record<string, unknown>;
    };

    const surface = createPluginSurface({
      registerBlock: registerBlockSpy,
      describeBlock: () => undefined,
      registerVariant: () => {},
      listBlockVariants: () => [],
    });

    surface.defineBlock({
      id: "my-plugin-block",
      name: "My Plugin Block",
      category: "text",
      attrsSchema: z.object({ title: z.string() }),
      render: () => "<div>plugin</div>",
    });

    expect(received).toBeDefined();
    expect(Object.hasOwn(received as object, "attrsSchema")).toBe(false);
  });
});
