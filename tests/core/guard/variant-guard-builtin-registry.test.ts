import { describe, expect, it } from "vitest";
import {
  describeBlock,
  getUnimplementedVariants,
  listBlocks,
} from "../../../packages/core/src/registry/block.ts";
import "../../../packages/blocks/src/index.ts";
import { KNOWN_BLOCKED_VARIANTS } from "../../../packages/blocks/src/known-blocked-variants.ts";
import { DIVIDER_SVG_VARIANTS } from "../../../packages/core/src/pipeline/divider-decoration.ts";
import { EXTERNALLY_IMPLEMENTED_VARIANTS } from "../../../packages/core/src/registry/externally-implemented-variants.ts";

// packages/blocks/src/index.ts registers ALL_BLOCKS as a side effect of this import;
// the count is a fixture locked against the current builtin catalog (ALL_BLOCKS.length).
const EXPECTED_BUILTIN_BLOCK_COUNT = 38;

describe("AC-006: 内置注册表在 throw-by-default 默认模式下零误伤", () => {
  it("全部内置块经模块导入完成注册，registry 中可查询到实际数量", () => {
    expect(listBlocks().length).toBe(EXPECTED_BUILTIN_BLOCK_COUNT);
    expect(describeBlock("callout")?.id).toBe("callout");
    expect(describeBlock("steps")?.id).toBe("steps");
  });

  it("throw-by-default 默认模式下全部内置块通过谓词校验，导入无中断且无残余未实现变体", () => {
    // throw-by-default 下，任一内置块存在未实现变体都会让 packages/blocks/src/index.ts
    // 的模块级 import 抛 E_VARIANT_NO_IMPL、整个测试文件加载失败；执行到此处即证明
    // 全部内置资产通过谓词校验。getUnimplementedVariants() 对健康目录恒为空集。
    expect(listBlocks().length).toBe(EXPECTED_BUILTIN_BLOCK_COUNT);
    expect(getUnimplementedVariants()).toEqual([]);
  });

  it("audio/video contract-pending 变体经归桶移除注册后不在候选集，且登记于 KNOWN_BLOCKED_VARIANTS", () => {
    const candidateKeys = new Set(
      getUnimplementedVariants().map((c) => `${c.blockId}::${c.variantId}`)
    );
    for (const key of ["audio::mini", "audio::full", "video::with-caption"]) {
      expect(candidateKeys.has(key)).toBe(false);
      expect(KNOWN_BLOCKED_VARIANTS.has(key)).toBe(true);
    }
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

describe("缺陷 A 修复：谓词④ external-pipeline 变体识别", () => {
  it("EXTERNALLY_IMPLEMENTED_VARIANTS 严格投影 DIVIDER_SVG_VARIANTS，非 SSOT 变体不豁免", () => {
    for (const v of DIVIDER_SVG_VARIANTS) {
      expect(EXTERNALLY_IMPLEMENTED_VARIANTS.has(`divider::${v}`)).toBe(true);
    }
    // thick/dotted/dashed 由 baseStyle（谓词①）实现，不属流水线 SSOT，不得被谓词④豁免
    for (const v of ["thick", "dotted", "dashed"]) {
      expect(EXTERNALLY_IMPLEMENTED_VARIANTS.has(`divider::${v}`)).toBe(false);
    }
  });

  it("divider.{wave,dots,flower}（divider.ts 空条目、实现落渲染流水线）不在未实现候选集", () => {
    const candidateKeys = new Set(
      getUnimplementedVariants().map((c) => `${c.blockId}::${c.variantId}`)
    );
    for (const v of ["wave", "dots", "flower"]) {
      expect(candidateKeys.has(`divider::${v}`)).toBe(false);
    }
  });
});
