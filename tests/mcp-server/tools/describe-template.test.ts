import { beforeAll, describe, expect, it } from "vitest";
import { registerBuiltins } from "../../../apps/mcp-server/src/bootstrap.ts";
import { describeTemplateTool } from "../../../apps/mcp-server/src/tools/describe-template.ts";

beforeAll(() => {
  registerBuiltins();
});

// ---- AC-006: describe_template(default, starter) → themeId / templateId / markdown / metadata ----

describe("AC-006: describeTemplateTool returns themeId, templateId, markdown, metadata for known template", () => {
  it("describe_template({ themeId: 'default', templateId: 'starter' }) returns registered starter content", () => {
    const result = describeTemplateTool({
      themeId: "default",
      templateId: "starter",
    }) as Record<string, unknown>;

    expect(result.themeId).toBe("default");
    expect(result.templateId).toBe("starter");
    expect(typeof result.markdown).toBe("string");
    expect((result.markdown as string).length).toBeGreaterThan(0);
    const metadata = result.metadata as Record<string, unknown>;
    expect(typeof metadata).toBe("object");
    expect(metadata).not.toBeNull();
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description as string).length).toBeGreaterThan(0);
  });
});

// ---- AC-006 (rich response): coveredElements / coveredBlocks / mdastSummary / dependencies ----

describe("AC-006 (rich response): describeTemplateTool returns coverage, mdast summary and dependencies", () => {
  it("default/starter exposes non-empty coveredElements, mdastSummary and dependencies", () => {
    const result = describeTemplateTool({
      themeId: "default",
      templateId: "starter",
    }) as Record<string, unknown>;

    const coveredElements = result.coveredElements as string[];
    expect(Array.isArray(coveredElements)).toBe(true);
    expect(coveredElements.length).toBeGreaterThan(0);

    const coveredBlocks = result.coveredBlocks as string[];
    expect(Array.isArray(coveredBlocks)).toBe(true);

    const mdastSummary = result.mdastSummary as {
      totalNodes: number;
      nodeCounts: Record<string, number>;
    };
    expect(typeof mdastSummary).toBe("object");
    expect(mdastSummary.totalNodes).toBeGreaterThan(0);
    expect(typeof mdastSummary.nodeCounts).toBe("object");

    const dependencies = result.dependencies as string[];
    expect(Array.isArray(dependencies)).toBe(true);
  });

  it("not-found responses do not carry rich fields", () => {
    const result = describeTemplateTool({
      themeId: "no-such-theme",
      templateId: "starter",
    }) as Record<string, unknown>;
    expect(result.code).toBe("E_THEME_NOT_FOUND");
    expect(result.coveredElements).toBeUndefined();
  });

  it("missing args default to empty strings and resolve to E_THEME_NOT_FOUND", () => {
    const result = describeTemplateTool({}) as Record<string, unknown>;
    expect(result.code).toBe("E_THEME_NOT_FOUND");
  });
});

// ---- not-found: themeId 不存在 → { code: 'E_THEME_NOT_FOUND' } ----

describe("not-found: unknown themeId returns E_THEME_NOT_FOUND", () => {
  it("describe_template({ themeId: 'no-such-theme', templateId: 'starter' }) → { code: 'E_THEME_NOT_FOUND' }", () => {
    const result = describeTemplateTool({
      themeId: "no-such-theme",
      templateId: "starter",
    }) as Record<string, unknown>;

    expect(result.code).toBe("E_THEME_NOT_FOUND");
  });
});

// ---- not-found: templateId 在该 theme 下不存在 → { code: 'E_TEMPLATE_NOT_FOUND' } ----

describe("not-found: unknown templateId returns E_TEMPLATE_NOT_FOUND", () => {
  it("describe_template({ themeId: 'default', templateId: 'no-such-template' }) → { code: 'E_TEMPLATE_NOT_FOUND' }", () => {
    const result = describeTemplateTool({
      themeId: "default",
      templateId: "no-such-template",
    }) as Record<string, unknown>;

    expect(result.code).toBe("E_TEMPLATE_NOT_FOUND");
  });
});
