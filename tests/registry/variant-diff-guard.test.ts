import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  INTENTIONAL_PLAIN_VARIANTS,
  registerBlock,
  registerTheme,
} from "../../packages/core/src/index.ts";
import { runVariantDiffGuard } from "../../packages/core/src/registry/variant-diff-guard.ts";
import "../../packages/blocks/src/index.ts";
import { KNOWN_BLOCKED_VARIANTS } from "../../packages/blocks/src/known-blocked-variants.ts";
import defaultTheme from "../../packages/themes/default/src/index.ts";
import { buildDirectiveMarkdown } from "../blocks/directive-markdown-fixtures.ts";

beforeAll(() => {
  registerTheme(defaultTheme);
});

describe("AC-001/AC-002: 真实注册表渲染期差分扫描 RED —— finding 为空集", () => {
  let findings: Awaited<ReturnType<typeof runVariantDiffGuard>>;

  beforeAll(async () => {
    findings = await runVariantDiffGuard({
      buildMarkdown: buildDirectiveMarkdown,
      themeId: "default",
      exclude: KNOWN_BLOCKED_VARIANTS,
    });
  });

  it("AC-001: 真实注册表全量差分 finding 为空集（排除 known-blocked 与 plain-allowlist 命中项后无 no-op 变体）", () => {
    expect(findings).toEqual([]);
  });

  it("AC-004: contract-pending 归桶的 audio/video 变体已移除注册，不出现在 finding 中，且登记于 KNOWN_BLOCKED_VARIANTS", () => {
    const findingKeys = new Set(findings.map((f) => `${f.blockId}::${f.variantId}`));
    for (const key of ["audio::mini", "audio::full", "video::with-caption"]) {
      expect(findingKeys.has(key)).toBe(false);
      expect(KNOWN_BLOCKED_VARIANTS.has(key)).toBe(true);
    }
  });

  it("AC-005: exclude 传入 KNOWN_BLOCKED_VARIANTS 时其成员不产生 finding（known-blocked 排除接线）", async () => {
    const excluded = await runVariantDiffGuard({
      buildMarkdown: buildDirectiveMarkdown,
      themeId: "default",
      exclude: KNOWN_BLOCKED_VARIANTS,
    });
    const keys = new Set(excluded.map((f) => `${f.blockId}::${f.variantId}`));
    for (const key of KNOWN_BLOCKED_VARIANTS) {
      expect(keys.has(key)).toBe(false);
    }
  });

  it("AC-002: callout.tip（root 含 box-shadow/background 等不同于 default 的声明）不出现在 finding 中", () => {
    const findingKeys = new Set(findings.map((f) => `${f.blockId}::${f.variantId}`));
    expect(findingKeys.has("callout::tip")).toBe(false);
  });
});

describe("AC-001/AC-003/排除集: 探针块差分判定", () => {
  afterEach(() => {
    INTENTIONAL_PLAIN_VARIANTS.delete("diff-guard-probe-allowlist::noop-allowlisted");
  });

  it("AC-001: baseStyle.root 为空对象（空 delta）的具名变体渲染 ≡ default，守卫返回该 finding", async () => {
    registerBlock({
      id: "diff-guard-probe-noop",
      name: "差分守卫探针块-空delta",
      category: "text",
      directiveAttrs: z.object({}).strict(),
      variants: [{ id: "noop", label: "空 delta 变体", baseStyle: { root: {} } }],
      slots: ["root"],
      decorate: () => {},
    });

    const findings = await runVariantDiffGuard({
      buildMarkdown: buildDirectiveMarkdown,
      themeId: "default",
    });

    expect(findings).toContainEqual({ blockId: "diff-guard-probe-noop", variantId: "noop" });
  });

  it("AC-003: 变体命中 plain-allowlist 时即便渲染 ≡ default 也不出现在 finding 中（对照：未登记时会被判定为 finding）", async () => {
    registerBlock({
      id: "diff-guard-probe-allowlist",
      name: "差分守卫探针块-allowlist",
      category: "text",
      directiveAttrs: z.object({}).strict(),
      variants: [{ id: "noop-allowlisted", label: "allowlist 豁免变体", baseStyle: { root: {} } }],
      slots: ["root"],
      decorate: () => {},
    });

    const before = await runVariantDiffGuard({
      buildMarkdown: buildDirectiveMarkdown,
      themeId: "default",
    });
    expect(before).toContainEqual({
      blockId: "diff-guard-probe-allowlist",
      variantId: "noop-allowlisted",
    });

    INTENTIONAL_PLAIN_VARIANTS.add("diff-guard-probe-allowlist::noop-allowlisted");
    const after = await runVariantDiffGuard({
      buildMarkdown: buildDirectiveMarkdown,
      themeId: "default",
    });
    expect(after).not.toContainEqual({
      blockId: "diff-guard-probe-allowlist",
      variantId: "noop-allowlisted",
    });
  });

  it("排除集命中的 blockId::variantId 不参与差分、不产生 finding（对照：不传排除集时该项确实被判定为 finding）", async () => {
    registerBlock({
      id: "diff-guard-probe-exclude",
      name: "差分守卫探针块-排除集",
      category: "text",
      directiveAttrs: z.object({}).strict(),
      variants: [{ id: "excluded-noop", label: "排除集豁免变体", baseStyle: { root: {} } }],
      slots: ["root"],
      decorate: () => {},
    });

    const withoutExclude = await runVariantDiffGuard({
      buildMarkdown: buildDirectiveMarkdown,
      themeId: "default",
    });
    expect(withoutExclude).toContainEqual({
      blockId: "diff-guard-probe-exclude",
      variantId: "excluded-noop",
    });

    const withExclude = await runVariantDiffGuard({
      buildMarkdown: buildDirectiveMarkdown,
      themeId: "default",
      exclude: new Set(["diff-guard-probe-exclude::excluded-noop"]),
    });
    expect(withExclude).not.toContainEqual({
      blockId: "diff-guard-probe-exclude",
      variantId: "excluded-noop",
    });
  });
});
