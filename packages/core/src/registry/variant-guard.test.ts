import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import type { BlockDefinition, BlockVariant } from "./block.ts";
import {
  describeBlock,
  getUnimplementedVariants,
  registerBlock,
  resetBlockRegistry,
} from "./block.ts";
import { INTENTIONAL_PLAIN_VARIANTS } from "./intentional-plain-variants.ts";

afterEach(() => {
  resetBlockRegistry();
});

function buildProbeBlock(
  overrides: Partial<Pick<BlockDefinition, "id" | "baseStyle" | "decorate">> & {
    variants: BlockVariant[];
  }
): BlockDefinition {
  return {
    id: "probe-block",
    name: "探针块",
    category: "text",
    directiveAttrs: z.object({}),
    slots: ["root"],
    ...overrides,
  };
}

describe("AC-001: 谓词① delta 放行", () => {
  it("具名变体自带非空 baseStyle 声明时不出现在候选集中", () => {
    registerBlock(
      buildProbeBlock({
        id: "probe-block-basestyle",
        variants: [{ id: "highlighted", label: "高亮", baseStyle: { root: { color: "#111" } } }],
      })
    );
    const candidates = getUnimplementedVariants();
    expect(
      candidates.some((c) => c.blockId === "probe-block-basestyle" && c.variantId === "highlighted")
    ).toBe(false);
  });

  it("变体 baseStyle 为空对象（零声明）时不满足谓词①，注册抛 E_VARIANT_NO_IMPL", () => {
    expect(() =>
      registerBlock(
        buildProbeBlock({
          id: "probe-block-empty-basestyle",
          variants: [{ id: "empty", label: "空声明", baseStyle: { root: {} } }],
        })
      )
    ).toThrow(/E_VARIANT_NO_IMPL/);
  });
});

describe("AC-002: 谓词② decorate 放行", () => {
  it("块声明 decorate 钩子时，其下无 baseStyle 的具名变体不出现在候选集中", () => {
    registerBlock(
      buildProbeBlock({
        id: "probe-block-decorate",
        decorate: () => {},
        variants: [{ id: "outlined", label: "轮廓" }],
      })
    );
    const candidates = getUnimplementedVariants();
    expect(
      candidates.some((c) => c.blockId === "probe-block-decorate" && c.variantId === "outlined")
    ).toBe(false);
  });
});

describe("AC-003: 谓词③ plain-allowlist 放行", () => {
  afterEach(() => {
    INTENTIONAL_PLAIN_VARIANTS.delete("probe-block-plain::plain");
  });

  it("变体命中 intentional-plain-variants 登记时不出现在候选集中", () => {
    INTENTIONAL_PLAIN_VARIANTS.add("probe-block-plain::plain");
    registerBlock(
      buildProbeBlock({
        id: "probe-block-plain",
        variants: [{ id: "plain", label: "纯净" }],
      })
    );
    const candidates = getUnimplementedVariants();
    expect(
      candidates.some((c) => c.blockId === "probe-block-plain" && c.variantId === "plain")
    ).toBe(false);
  });
});

describe("AC-004: 默认即 throw —— 三谓词均不满足的未实现变体块硬拒且不入库", () => {
  it("默认模式下注册含未实现变体的块抛 E_VARIANT_NO_IMPL、携带 unimplementedVariants、且块不入库", () => {
    let caught: unknown;
    try {
      registerBlock(
        buildProbeBlock({
          id: "probe-block-throw",
          variants: [{ id: "ghost", label: "幽灵" }],
        })
      );
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(Error);
    const err = caught as Error & {
      code?: string;
      unimplementedVariants?: Array<{ blockId: string; variantId: string; reason: string }>;
    };
    expect(err.code).toBe("E_VARIANT_NO_IMPL");
    expect(Array.isArray(err.unimplementedVariants)).toBe(true);

    const entry = err.unimplementedVariants?.find(
      (e) => e.blockId === "probe-block-throw" && e.variantId === "ghost"
    );
    expect(entry).toBeDefined();
    if (!entry) throw new Error("unreachable: entry asserted defined above");
    expect(entry.reason.length).toBeGreaterThan(0);
    expect(/baseStyle|decorate|allowlist/i.test(entry.reason)).toBe(true);

    // 未实现变体的块不入库（store.set 在谓词校验之后，与 FORBIDDEN 声明守卫顺序一致）
    expect(describeBlock("probe-block-throw")).toBeUndefined();
  });
});

describe("registerBlock 变体守卫 —— default 变体豁免", () => {
  it("default 变体不参与谓词判定，即使无 baseStyle/decorate 也不阻断注册", () => {
    expect(() =>
      registerBlock(
        buildProbeBlock({
          id: "probe-block-default-exempt",
          variants: [{ id: "default", label: "默认" }],
        })
      )
    ).not.toThrow();
    expect(getUnimplementedVariants().some((c) => c.blockId === "probe-block-default-exempt")).toBe(
      false
    );
  });
});
