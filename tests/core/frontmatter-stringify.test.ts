import { describe, expect, it } from "vitest";
import { parseFrontmatter } from "../../packages/core/src/pipeline/frontmatter.ts";
import { upsertFrontmatterPaint } from "../../packages/core/src/pipeline/frontmatter.ts";

describe("upsertFrontmatterPaint: round-trip", () => {
  it("无 frontmatter 源码 + paint → 产出带 frontmatter 的源码，parseFrontmatter 回读 paint 相等", () => {
    const md = "# Hello\n";
    const paint = { "--color-brand": "#ff0000" };
    const result = upsertFrontmatterPaint(md, paint);
    expect(result).toContain("---");
    expect(result).toContain("paint:");
    const { meta } = parseFrontmatter(result);
    expect(meta.paint).toEqual(paint);
  });

  it("已有 frontmatter（含 theme 字段）+ paint → 保留 theme、加/覆盖 paint，回读 theme+paint 均正确", () => {
    const md = "---\ntheme: tech\n---\n# Hello\n";
    const paint = { "--color-brand": "#123456" };
    const result = upsertFrontmatterPaint(md, paint);
    const { meta } = parseFrontmatter(result);
    expect(meta.theme).toBe("tech");
    expect(meta.paint).toEqual(paint);
  });

  it("已有 paint 字段 + 新 paint → 覆盖旧 paint 整体（以传入 paint 为准）", () => {
    const md = "---\ntheme: tech\npaint:\n  '--color-brand': '#000000'\n---\n# Hello\n";
    const paint = { "--color-brand": "#aabbcc", "--color-accent": "#112233" };
    const result = upsertFrontmatterPaint(md, paint);
    const { meta } = parseFrontmatter(result);
    expect(meta.paint).toEqual(paint);
    expect(meta.theme).toBe("tech");
  });

  it("空 paint {} → 移除 paint 字段（回读 meta.paint 为 undefined）", () => {
    const md = "---\ntheme: tech\npaint:\n  '--color-brand': '#ff0000'\n---\n# Hello\n";
    const result = upsertFrontmatterPaint(md, {});
    const { meta } = parseFrontmatter(result);
    expect(meta.paint).toBeUndefined();
    expect(meta.theme).toBe("tech");
  });

  it("空 paint {} 且 meta 为空 → 源码无 frontmatter（直接返回 content）", () => {
    const md = "# Hello\n";
    const result = upsertFrontmatterPaint(md, {});
    expect(result).not.toContain("---");
    expect(result).toBe(md);
  });

  it("round-trip 幂等：upsert(upsert(md, p), p) 与 upsert(md, p) 回读 meta.paint 相等", () => {
    const md = "# Hello\n";
    const paint = { "--color-brand": "#ff0000" };
    const once = upsertFrontmatterPaint(md, paint);
    const twice = upsertFrontmatterPaint(once, paint);
    expect(parseFrontmatter(once).meta.paint).toEqual(parseFrontmatter(twice).meta.paint);
  });
});
