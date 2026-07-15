import { describe, expect, it } from "vitest";
import {
  describeBlock,
  getUnimplementedVariants,
  listBlocks,
} from "../../../packages/core/src/registry/block.ts";
import "../../../packages/blocks/src/index.ts";

// packages/blocks/src/index.ts registers ALL_BLOCKS (40 entries) as a side effect of
// this import; the exact count is a fixture value locked against the current builtin
// catalog (verified via `pnpm vitest run` against packages/blocks/src/index.ts#ALL_BLOCKS
// prior to writing this test).
const EXPECTED_BUILTIN_BLOCK_COUNT = 40;

describe("AC-006: 内置注册表在 collect-only 默认模式下零误伤", () => {
  it("全部内置块经模块导入完成注册，registry 中可查询到实际数量", () => {
    expect(listBlocks().length).toBe(EXPECTED_BUILTIN_BLOCK_COUNT);
    expect(describeBlock("callout")?.id).toBe("callout");
    expect(describeBlock("steps")?.id).toBe("steps");
  });

  it("collect-only 默认模式下不因未实现变体阻断内置块注册（无 suite 中断）", () => {
    // 若默认模式为 throw 或谓词校验在导入期抛错，上面的模块级 import 本身就会让
    // 整个测试文件加载失败；执行到此处即证明注册未被阻断。
    expect(listBlocks().length).toBe(EXPECTED_BUILTIN_BLOCK_COUNT);

    const candidates = getUnimplementedVariants();
    expect(Array.isArray(candidates)).toBe(true);
    for (const c of candidates) {
      expect(typeof c.blockId).toBe("string");
      expect(typeof c.variantId).toBe("string");
      expect(typeof c.reason).toBe("string");
      expect(c.reason.length).toBeGreaterThan(0);
    }
  });

  it("audio/video 未实现变体（无 baseStyle 无 decorate，T-191 阶段未登记 allowlist）真实出现在候选集中", () => {
    const candidateKeys = new Set(
      getUnimplementedVariants().map((c) => `${c.blockId}::${c.variantId}`)
    );
    expect(candidateKeys.has("audio::mini")).toBe(true);
    expect(candidateKeys.has("audio::full")).toBe(true);
    expect(candidateKeys.has("video::autoplay")).toBe(true);
    expect(candidateKeys.has("video::with-caption")).toBe(true);
  });

  it("callout 全部具名变体自带 baseStyle，不出现在候选集中（谓词①真实放行内置数据）", () => {
    const candidateKeys = new Set(
      getUnimplementedVariants().map((c) => `${c.blockId}::${c.variantId}`)
    );
    expect(candidateKeys.has("callout::tip")).toBe(false);
    expect(candidateKeys.has("callout::warning")).toBe(false);
    expect(candidateKeys.has("callout::info")).toBe(false);
    expect(candidateKeys.has("callout::danger")).toBe(false);
  });

  it("steps 块级 decorate 钩子静态放行其无 baseStyle 的具名变体（谓词②真实放行内置数据）", () => {
    const candidateKeys = new Set(
      getUnimplementedVariants().map((c) => `${c.blockId}::${c.variantId}`)
    );
    expect(candidateKeys.has("steps::horizontal")).toBe(false);
    expect(candidateKeys.has("steps::numbered")).toBe(false);
  });
});
