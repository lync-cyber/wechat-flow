import { beforeAll, describe, expect, it } from "vitest";
import { describeBlock, registerTheme } from "../../packages/core/src/index.ts";
import { runVariantDiffGuard } from "../../packages/core/src/registry/variant-diff-guard.ts";
import "../../packages/blocks/src/index.ts";
import defaultTheme from "../../packages/themes/default/src/index.ts";
import { buildDirectiveMarkdown } from "./directive-markdown-fixtures.ts";

const CONTENT_DEPENDENT_VARIANTS = [
  { blockId: "code-block", variantId: "light" },
  { blockId: "code-block", variantId: "minimal" },
  { blockId: "list", variantId: "bullet" },
  { blockId: "list", variantId: "numbered" },
  { blockId: "list", variantId: "checklist" },
] as const;

describe("差分守卫共享 fixture 内容充分性：结构化内容块不因内容饥饿假 finding", () => {
  let findingKeys: Set<string>;

  beforeAll(async () => {
    registerTheme(defaultTheme);
    const findings = await runVariantDiffGuard({
      buildMarkdown: buildDirectiveMarkdown,
      themeId: "default",
    });
    findingKeys = new Set(findings.map((f) => `${f.blockId}::${f.variantId}`));
  });

  it("待测变体均已在真实注册表登记（防空过）", () => {
    for (const { blockId, variantId } of CONTENT_DEPENDENT_VARIANTS) {
      const variant = describeBlock(blockId)?.variants.find((v) => v.id === variantId);
      expect(variant, `${blockId}::${variantId} 应已注册`).toBeDefined();
    }
  });

  it("code-block.{light,minimal} 与 list.{bullet,numbered,checklist} 在共享 fixture 下渲染 ≠ default，不产生 finding", () => {
    for (const { blockId, variantId } of CONTENT_DEPENDENT_VARIANTS) {
      expect(
        findingKeys.has(`${blockId}::${variantId}`),
        `${blockId}::${variantId} 应因共享 fixture 提供结构化内容而 ≠ default`
      ).toBe(false);
    }
  });
});
