import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  type ClipboardPayload,
  type DiagnosticReport,
  type TemplateDefinition,
  renderMarkdownRequestSchema,
  renderMarkdownResponseSchema,
  toJSON,
} from "../../packages/contracts/src/index.ts";

describe("AC-001: renderMarkdownRequestSchema shape", () => {
  it("inferred type contains markdown:string and optional fields", () => {
    type Req = z.infer<typeof renderMarkdownRequestSchema>;
    const valid: Req = { markdown: "# hello" };
    const result = renderMarkdownRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const result = renderMarkdownRequestSchema.safeParse({
      markdown: "# hi",
      themeId: "literary",
      rulesetVersion: "1.0.0",
      paint: { primary: "#ff0000" },
      baseColor: "#ff0000",
    });
    expect(result.success).toBe(true);
  });

  it("requires markdown field", () => {
    const result = renderMarkdownRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("AC-002: toJSON produces JSON Schema Draft-7 shape", () => {
  it("returns object with type:object", () => {
    const schema = toJSON(renderMarkdownRequestSchema);
    expect(schema).toMatchObject({ type: "object" });
  });

  it("contains properties.markdown.type:string", () => {
    const schema = toJSON(renderMarkdownRequestSchema);
    expect(
      (schema as { properties?: { markdown?: { type?: string } } }).properties?.markdown?.type
    ).toBe("string");
  });
});

describe("AC-003: renderMarkdownResponseSchema valid parse", () => {
  it("parses valid response", () => {
    const result = renderMarkdownResponseSchema.safeParse({
      html: "<p>test</p>",
      diagnostics: [],
      rulesetVersion: "1.0.0",
      themeVersion: "1.0.0",
      postPaste: false,
    });
    expect(result.success).toBe(true);
  });
});

describe("AC-003b: renderMarkdownResponseSchema accepts optional versionTriple", () => {
  it("parses response with versionTriple present", () => {
    const result = renderMarkdownResponseSchema.safeParse({
      html: "<p/>",
      diagnostics: [],
      rulesetVersion: "1.0.0",
      themeVersion: "1.0.0",
      postPaste: false,
      versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
    });
    expect(result.success).toBe(true);
  });

  it("still parses response without versionTriple (backwards compatible)", () => {
    const result = renderMarkdownResponseSchema.safeParse({
      html: "<p>test</p>",
      diagnostics: [],
      rulesetVersion: "1.0.0",
      themeVersion: "1.0.0",
      postPaste: false,
    });
    expect(result.success).toBe(true);
  });
});

describe("AC-004: renderMarkdownResponseSchema invalid parse", () => {
  it("fails when html is not a string", () => {
    const result = renderMarkdownResponseSchema.safeParse({ html: 123 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("html");
    }
  });
});

describe("AC-005: type exports are present and correct", () => {
  it("ClipboardPayload has html and text string fields", () => {
    const payload: ClipboardPayload = { html: "<b>hi</b>", text: "hi" };
    expect(payload.html).toBe("<b>hi</b>");
    expect(payload.text).toBe("hi");
  });

  it("DiagnosticReport has three array fields and versionTriple", () => {
    const report: DiagnosticReport = {
      diagnostics: [],
      nodeChangeRecords: [],
      nightRiskIssues: [],
      versionTriple: { coreVersion: "0.0.0", themeVersion: "0.0.0", rulesetVersion: "0.0.0" },
    };
    expect(Array.isArray(report.diagnostics)).toBe(true);
    expect(Array.isArray(report.nodeChangeRecords)).toBe(true);
    expect(Array.isArray(report.nightRiskIssues)).toBe(true);
    expect(typeof report.versionTriple.rulesetVersion).toBe("string");
  });

  it("TemplateDefinition has templateId and themeId string fields", () => {
    const def: TemplateDefinition = { templateId: "t1", themeId: "literary" };
    expect(def.templateId).toBe("t1");
    expect(def.themeId).toBe("literary");
  });
});
