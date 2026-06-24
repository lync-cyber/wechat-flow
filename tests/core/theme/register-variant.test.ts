import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  describeBlock,
  registerBlock,
  resetBlockRegistry,
} from "../../../packages/core/src/registry/block.ts";
import {
  describeVariant,
  getBlockBaseStyle,
  listBlockVariants,
  registerVariant,
  resetVariantRegistry,
} from "../../../packages/core/src/registry/variant.ts";
// Side-effect import registers all built-in blocks (incl. callout) and an onRegistryReset
// hook, so resetBlockRegistry() in beforeEach re-registers them for every test.
import "../../../packages/blocks/src/index.ts";

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
});

// AC-001: registerVariant registers and getBlockBaseStyle returns style.root
describe("AC-001: registerVariant 注册后 listBlockVariants 和 getBlockBaseStyle 返回正确值", () => {
  it("listBlockVariants 含 { id, label } 条目", () => {
    registerVariant({
      blockId: "callout",
      id: "my:dark",
      label: "Dark",
      style: { root: { "background-color": "#1a1a1a" } },
    });
    const variants = listBlockVariants("callout");
    const entry = variants.find((v) => v.id === "my:dark");
    expect(entry?.id).toBe("my:dark");
    expect(entry?.label).toBe("Dark");
  });

  it("getBlockBaseStyle 返回 style.root 声明 map", () => {
    registerVariant({
      blockId: "callout",
      id: "my:dark",
      label: "Dark",
      style: { root: { "background-color": "#1a1a1a" } },
    });
    const base = getBlockBaseStyle("callout", "my:dark");
    expect(base["background-color"]).toBe("#1a1a1a");
  });

  it("getBlockBaseStyle 仅返回 root 槽位声明，不含其他槽", () => {
    registerBlock({
      id: "multi-slot-test",
      name: "多槽测试",
      attrsSchema: z.object({}),
      variants: [],
      slots: ["root", "icon"],
    });
    registerVariant({
      blockId: "multi-slot-test",
      id: "my:dark",
      label: "Dark",
      style: {
        root: { "background-color": "#1a1a1a" },
        icon: { color: "#fff" },
      },
    });
    const base = getBlockBaseStyle("multi-slot-test", "my:dark");
    expect(base["background-color"]).toBe("#1a1a1a");
    expect(Object.keys(base)).not.toContain("icon");
  });
});

// AC-002: registerVariant rejects non-whitelisted CSS property — no partial registration
describe("AC-002: registerVariant 拒绝白名单外属性并抛结构化错误，不产生部分注册", () => {
  it("style 含 position:fixed 时抛错，错误含 rejectedDeclarations 数组", () => {
    let thrown: unknown;
    try {
      registerVariant({
        blockId: "callout",
        id: "bad:variant",
        label: "Bad",
        style: { root: { position: "fixed" } },
      });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeDefined();
    const err = thrown as { rejectedDeclarations?: unknown[] };
    expect(Array.isArray(err.rejectedDeclarations)).toBe(true);
    expect((err.rejectedDeclarations as unknown[]).length).toBeGreaterThan(0);
  });

  it("rejectedDeclarations[0] 含 slot/property/value/reason 字段", () => {
    let thrown: unknown;
    try {
      registerVariant({
        blockId: "callout",
        id: "bad:variant",
        label: "Bad",
        style: { root: { position: "fixed" } },
      });
    } catch (e) {
      thrown = e;
    }
    const err = thrown as {
      rejectedDeclarations?: Array<{
        slot: string;
        property: string;
        value: string;
        reason: string;
      }>;
    };
    const decl = err.rejectedDeclarations?.[0];
    expect(decl?.slot).toBe("root");
    expect(decl?.property).toBe("position");
    expect(decl?.value).toBe("fixed");
    expect(typeof decl?.reason).toBe("string");
    expect(decl?.reason.length).toBeGreaterThan(0);
    // reason must carry 'whitelist' semantics
    expect(decl?.reason.toLowerCase()).toMatch(/whitelist|not allowed|disallowed|blocked/);
  });

  it("抛错后 listBlockVariants 查不到该 variant（无部分注册）", () => {
    try {
      registerVariant({
        blockId: "callout",
        id: "bad:variant",
        label: "Bad",
        style: { root: { position: "fixed" } },
      });
    } catch {
      // expected
    }
    const variants = listBlockVariants("callout");
    const found = variants.find((v) => v.id === "bad:variant");
    expect(found).toBeUndefined();
  });

  it("抛错后 describeVariant 也查不到该 variant", () => {
    try {
      registerVariant({
        blockId: "callout",
        id: "bad:variant",
        label: "Bad",
        style: { root: { position: "fixed" } },
      });
    } catch {
      // expected
    }
    const def = describeVariant("bad:variant");
    expect(def).toBeUndefined();
  });
});

// AC-003: duplicate registration throws E_VARIANT_CONFLICT
describe("AC-003: 重复注册相同 blockId+id 抛 E_VARIANT_CONFLICT，现有注册不变", () => {
  it("重复注册抛 E_VARIANT_CONFLICT 标识错误", () => {
    registerVariant({
      blockId: "callout",
      id: "my:dark",
      label: "Dark",
      style: { root: { "background-color": "#1a1a1a" } },
    });
    let thrown: unknown;
    try {
      registerVariant({
        blockId: "callout",
        id: "my:dark",
        label: "Dark v2",
        style: { root: { "background-color": "#000" } },
      });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeDefined();
    const err = thrown as { code?: string; message?: string };
    const hasConflictId =
      err.code === "E_VARIANT_CONFLICT" ||
      (typeof err.message === "string" && err.message.includes("E_VARIANT_CONFLICT"));
    expect(hasConflictId).toBe(true);
  });

  it("冲突后原注册条目 label 不变", () => {
    registerVariant({
      blockId: "callout",
      id: "my:dark",
      label: "Dark",
      style: { root: { "background-color": "#1a1a1a" } },
    });
    try {
      registerVariant({
        blockId: "callout",
        id: "my:dark",
        label: "Dark v2",
        style: { root: { "background-color": "#000" } },
      });
    } catch {
      // expected
    }
    const variants = listBlockVariants("callout");
    const entry = variants.find((v) => v.id === "my:dark");
    expect(entry?.label).toBe("Dark");
  });

  it("冲突后 getBlockBaseStyle 仍返回原始 style.root", () => {
    registerVariant({
      blockId: "callout",
      id: "my:dark",
      label: "Dark",
      style: { root: { "background-color": "#1a1a1a" } },
    });
    try {
      registerVariant({
        blockId: "callout",
        id: "my:dark",
        label: "Dark v2",
        style: { root: { "background-color": "#000000" } },
      });
    } catch {
      // expected
    }
    const base = getBlockBaseStyle("callout", "my:dark");
    expect(base["background-color"]).toBe("#1a1a1a");
  });
});

// AC-004: defineBlock with baseStyle → getBlockBaseStyle('callout','default') returns non-empty record
describe("AC-004: defineBlock 携带 baseStyle 后 getBlockBaseStyle('callout','default') 返回骨架样式", () => {
  it("getBlockBaseStyle('callout','default') 返回含 border-left 或 padding 等骨架键的 record", async () => {
    // Importing blocks/index triggers registerBlock for all blocks (including callout with baseStyle)
    await import("../../../packages/blocks/src/index.ts");
    const base = getBlockBaseStyle("callout", "default");
    // Must be a non-empty record
    expect(Object.keys(base).length).toBeGreaterThan(0);
    // callout base-style should contain structural CSS properties
    const hasStructuralKey =
      "border-left" in base ||
      "padding" in base ||
      "background-color" in base ||
      "border" in base ||
      "margin" in base;
    expect(hasStructuralKey).toBe(true);
  });

  it("getBlockBaseStyle('callout','default') 中的每个值都是非空字符串", async () => {
    await import("../../../packages/blocks/src/index.ts");
    const base = getBlockBaseStyle("callout", "default");
    for (const [, value] of Object.entries(base)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

// AC-005: defineBlock with baseStyle missing 'root' slot throws structured error
describe("AC-005: defineBlock baseStyle 缺 root 槽位时注册抛结构化错误并拒绝注册", () => {
  it("(a) baseStyle 无 root 槽时注册抛错", () => {
    const { defineBlock } = require("../../../packages/blocks/src/factory.ts");
    const { registerBlock } = require("../../../packages/core/src/registry/block.ts");
    const { z } = require("zod");
    const block = defineBlock(
      "test-no-root",
      "测试无 root",
      z.object({ text: z.string() }),
      [{ id: "default", label: "默认" }],
      { title: { "font-size": "16px" } } // no 'root' key
    );
    let thrown: unknown;
    try {
      registerBlock(block);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeDefined();
  });

  it("(b) 抛出的错误含可定位信息（含 slot/key 语义或 'root' 字样）", () => {
    const { defineBlock } = require("../../../packages/blocks/src/factory.ts");
    const { registerBlock } = require("../../../packages/core/src/registry/block.ts");
    const { z } = require("zod");
    const block = defineBlock(
      "test-no-root-b",
      "测试无 root b",
      z.object({ text: z.string() }),
      [{ id: "default", label: "默认" }],
      { title: { "font-size": "16px" } }
    );
    let thrown: unknown;
    try {
      registerBlock(block);
    } catch (e) {
      thrown = e;
    }
    const err = thrown as { message?: string; slot?: string; key?: string };
    const hasLocatable =
      (typeof err.message === "string" &&
        (err.message.toLowerCase().includes("root") ||
          err.message.toLowerCase().includes("slot") ||
          err.message.toLowerCase().includes("basestyle"))) ||
      err.slot === "root" ||
      err.key === "root";
    expect(hasLocatable).toBe(true);
  });

  it("抛错后 describeBlock 查不到该 block（无部分注册）", () => {
    const { defineBlock } = require("../../../packages/blocks/src/factory.ts");
    const {
      registerBlock,
      describeBlock,
    } = require("../../../packages/core/src/registry/block.ts");
    const { z } = require("zod");
    const block = defineBlock(
      "test-no-root-c",
      "测试无 root c",
      z.object({ text: z.string() }),
      [{ id: "default", label: "默认" }],
      { title: { "font-size": "16px" } }
    );
    try {
      registerBlock(block);
    } catch {
      // expected
    }
    const def = describeBlock("test-no-root-c");
    expect(def).toBeUndefined();
  });
});

// SR-D-003: describeVariant 跨 blockId 同名 variantId 碰撞 — 返回首注册
describe("SR-D-003: describeVariant 跨 blockId 同名 variantId 返回首注册（确定性）", () => {
  it("callout::dark 先注册、card::dark 后注册 → describeVariant('dark') 返回 callout::dark", () => {
    registerVariant({
      blockId: "callout",
      id: "dark",
      label: "Dark Callout",
      style: { root: { "background-color": "#111" } },
    });
    registerVariant({
      blockId: "card",
      id: "dark",
      label: "Dark Card",
      style: { root: { "background-color": "#222" } },
    });

    const result = describeVariant("dark");
    expect(result).toBeDefined();
    expect(result?.blockId).toBe("callout");
    expect(result?.style.root["background-color"]).toBe("#111");
  });
});

function caughtCode(fn: () => void): string | undefined {
  try {
    fn();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
}

// T-122 core: registerVariant 的扩展校验链（E_SCHEMA / E_BLOCK_NOT_FOUND / E_SLOT_UNKNOWN）
describe("T-122-core: registerVariant 扩展校验抛带 code 的结构化错误", () => {
  it("blockId 不在注册中心时抛 E_BLOCK_NOT_FOUND", () => {
    const code = caughtCode(() =>
      registerVariant({
        blockId: "no-such-block",
        id: "my:dark",
        label: "Dark",
        style: { root: { color: "#000" } },
      })
    );
    expect(code).toBe("E_BLOCK_NOT_FOUND");
  });

  it("style 含 Block 未声明的槽位键时抛 E_SLOT_UNKNOWN", () => {
    const code = caughtCode(() =>
      registerVariant({
        blockId: "callout",
        id: "my:dark",
        label: "Dark",
        style: { "unknown-slot": { color: "#000" } },
      })
    );
    expect(code).toBe("E_SLOT_UNKNOWN");
  });

  it("blockId / variantId / label 为空字符串时抛 E_SCHEMA", () => {
    expect(
      caughtCode(() =>
        registerVariant({ blockId: "", id: "x", label: "X", style: { root: { color: "#000" } } })
      )
    ).toBe("E_SCHEMA");
    expect(
      caughtCode(() =>
        registerVariant({
          blockId: "callout",
          id: "",
          label: "X",
          style: { root: { color: "#000" } },
        })
      )
    ).toBe("E_SCHEMA");
    expect(
      caughtCode(() =>
        registerVariant({
          blockId: "callout",
          id: "x",
          label: "",
          style: { root: { color: "#000" } },
        })
      )
    ).toBe("E_SCHEMA");
  });

  it("style 为空 map 时抛 E_SCHEMA", () => {
    const code = caughtCode(() =>
      registerVariant({ blockId: "callout", id: "my:dark", label: "Dark", style: {} })
    );
    expect(code).toBe("E_SCHEMA");
  });

  it("style 槽位值非对象（声明 map 不是 Record）时抛 E_SCHEMA", () => {
    const code = caughtCode(() =>
      registerVariant({
        blockId: "callout",
        id: "my:dark",
        label: "Dark",
        style: { root: "not-an-object" as unknown as Record<string, string> },
      })
    );
    expect(code).toBe("E_SCHEMA");
  });

  it("registerBlock: slots 缺 root → 抛错且不注册", () => {
    let thrown: unknown;
    try {
      registerBlock({
        id: "no-root-slot",
        name: "无 root 槽",
        attrsSchema: z.object({}),
        variants: [],
        baseStyle: { root: { color: "#000000" } },
        slots: ["title"],
      });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeDefined();
    expect((thrown as { message?: string }).message?.toLowerCase()).toContain("root");
    expect(describeBlock("no-root-slot")).toBeUndefined();
  });

  it("variantId 命中 Block 内置 variant 时抛 E_VARIANT_CONFLICT", () => {
    const code = caughtCode(() =>
      registerVariant({
        blockId: "callout",
        id: "filled",
        label: "Filled",
        style: { root: { "background-color": "#000" } },
      })
    );
    expect(code).toBe("E_VARIANT_CONFLICT");
  });
});

// AC-006: structural source assertions
describe("AC-006: 实现源码含 registerVariant 函数 + 白名单校验 + getBlockBaseStyle；factory.ts 含 baseStyle 形参", () => {
  it("packages/core/src/registry/variant.ts 源码含 registerVariant 函数声明", () => {
    const src = readFileSync(join(process.cwd(), "packages/core/src/registry/variant.ts"), "utf-8");
    expect(src).toMatch(/function registerVariant/);
  });

  it("packages/core/src/registry/variant.ts 源码含 getBlockBaseStyle 函数声明", () => {
    const src = readFileSync(join(process.cwd(), "packages/core/src/registry/variant.ts"), "utf-8");
    expect(src).toMatch(/function getBlockBaseStyle/);
  });

  it("packages/core/src/registry/variant.ts 源码含白名单校验（whitelist 字面量或 WHITELIST 常量）", () => {
    const src = readFileSync(join(process.cwd(), "packages/core/src/registry/variant.ts"), "utf-8");
    const hasWhitelistRef =
      /whitelist/i.test(src) ||
      /ALLOWED_PROPS/i.test(src) ||
      /SAFE_PROPS/i.test(src) ||
      /CSS_PROP_ALLOWLIST/i.test(src) ||
      /allowedProperties/i.test(src);
    expect(hasWhitelistRef).toBe(true);
  });

  it("packages/blocks/src/factory.ts 源码含 baseStyle 形参", () => {
    const src = readFileSync(join(process.cwd(), "packages/blocks/src/factory.ts"), "utf-8");
    expect(src).toMatch(/baseStyle/);
  });
});
