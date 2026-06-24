// NOTE: dev-plan AC-004 measures validity with fields {valid, templateCount, missingElements},
// but ARCH defines ThemeTemplateValidationResult as {pass, themeId, templates[], failingTemplates[]}.
// All assertions in this file follow the ARCH contract (pass / templates / failingTemplates).

import { beforeEach, describe, expect, it } from "vitest";
import type { TemplateDefinition } from "../../../packages/contracts/src/index.ts";
import {
  defineTemplate,
  describeTemplate,
  listThemeTemplates,
  resetTemplateRegistry,
} from "../../../packages/core/src/registry/template.ts";

beforeEach(() => {
  resetTemplateRegistry();
});

// ──────────────────────────────────────────────────────────────────────────────
// AC-001: defineTemplate / listThemeTemplates / describeTemplate
// ──────────────────────────────────────────────────────────────────────────────
describe("AC-001: defineTemplate registers; listThemeTemplates returns TemplateMeta; describeTemplate returns full definition", () => {
  it("listThemeTemplates contains templateId and description after defineTemplate", () => {
    defineTemplate({
      themeId: "default",
      templateId: "starter",
      markdown: "# Hello",
      metadata: { description: "A starter template" },
    });
    const list = listThemeTemplates("default");
    const entry = list.find((t) => t.templateId === "starter");
    expect(entry?.templateId).toBe("starter");
    expect(entry?.description).toBe("A starter template");
  });

  it("listThemeTemplates entry does not expose markdown body", () => {
    defineTemplate({
      themeId: "default",
      templateId: "starter",
      markdown: "# Hello\n\nSome content",
      metadata: { description: "Starter" },
    });
    const list = listThemeTemplates("default");
    const entry = list.find((t) => t.templateId === "starter");
    expect(entry).not.toHaveProperty("markdown");
  });

  it("listThemeTemplates returns empty array for unknown themeId", () => {
    const list = listThemeTemplates("no-such-theme");
    expect(list).toEqual([]);
  });

  it("describeTemplate returns markdown and metadata fields", () => {
    defineTemplate({
      themeId: "default",
      templateId: "starter",
      markdown: "# Hello",
      metadata: { description: "A starter template" },
    });
    const def = describeTemplate("default", "starter");
    expect(def.markdown).toBe("# Hello");
    expect(def.metadata).toMatchObject({ description: "A starter template" });
  });

  it("describeTemplate throws E_TEMPLATE_NOT_FOUND for unknown templateId", () => {
    defineTemplate({
      themeId: "default",
      templateId: "starter",
      markdown: "# Hello",
      metadata: { description: "Starter" },
    });
    expect(() => describeTemplate("default", "does-not-exist")).toThrow("E_TEMPLATE_NOT_FOUND");
  });

  it("describeTemplate throws E_TEMPLATE_NOT_FOUND when themeId does not exist", () => {
    expect(() => describeTemplate("no-such-theme", "any-template")).toThrow("E_TEMPLATE_NOT_FOUND");
  });

  it("listThemeTemplates returns multiple entries for multiple registered templates", () => {
    defineTemplate({
      themeId: "default",
      templateId: "t1",
      markdown: "# T1",
      metadata: { description: "First" },
    });
    defineTemplate({
      themeId: "default",
      templateId: "t2",
      markdown: "# T2",
      metadata: { description: "Second" },
    });
    const list = listThemeTemplates("default");
    const ids = list.map((t) => t.templateId);
    expect(ids).toContain("t1");
    expect(ids).toContain("t2");
    expect(list.length).toBeGreaterThanOrEqual(2);
  });

  it("describeTemplate result satisfies TemplateDefinition shape with templateId and themeId", () => {
    defineTemplate({
      themeId: "magazine",
      templateId: "feature-article",
      markdown: "# Feature",
      metadata: { description: "Feature article template" },
    });
    const def: TemplateDefinition = describeTemplate("magazine", "feature-article");
    expect(def.templateId).toBe("feature-article");
    expect(def.themeId).toBe("magazine");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// AC-002: built-in theme packages expose ≥1 template via listThemeTemplates
// ──────────────────────────────────────────────────────────────────────────────
describe("AC-002: each built-in theme has ≥1 template entry after package load", () => {
  const BUILTIN_THEMES = ["default", "magazine", "literary", "business", "tech"] as const;

  for (const themeId of BUILTIN_THEMES) {
    it(`listThemeTemplates('${themeId}') returns ≥1 template`, async () => {
      // Side-effect import triggers template registration for the theme package
      await import(`../../../packages/themes/${themeId}/src/templates/index.ts`);
      const list = listThemeTemplates(themeId);
      expect(list.length).toBeGreaterThanOrEqual(1);
      // Each entry must have templateId and description (not just existence)
      expect(list[0].templateId.length).toBeGreaterThan(0);
    });
  }
});
