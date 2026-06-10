import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import {
  ALL_TOOL_SCHEMAS,
  ASYNC_TOOL_COUNT,
  SYNC_TOOL_COUNT,
  TOTAL_TOOL_COUNT,
  applyZhTypoResponseSchema,
  derivePaletteResponseSchema,
  describeBlockResponseSchema,
  describeMarkResponseSchema,
  describeTemplateResponseSchema,
  describeThemeResponseSchema,
  describeTokenResponseSchema,
  describeVariantResponseSchema,
  exportClipboardPayloadResponseSchema,
  exportCoverResponseSchema,
  exportLongImageResponseSchema,
  getJobResponseSchema,
  getRulesetVersionResponseSchema,
  lintMarkdownResponseSchema,
  listBlockVariantsResponseSchema,
  listBlocksResponseSchema,
  listMarksResponseSchema,
  listThemesResponseSchema,
  listTokensResponseSchema,
  renderMarkdownResponseSchema,
  simulatePasteResponseSchema,
  uploadImageResponseSchema,
  uploadToWechatAssetResponseSchema,
} from "../../packages/contracts/src/index.ts";

describe("AC-006: Tool schema count = 23 (19 sync + 4 async)", () => {
  it("ALL_TOOL_SCHEMAS registry has exactly 23 entries", () => {
    const count = Object.keys(ALL_TOOL_SCHEMAS).length;
    expect(count).toBe(23);
  });

  it("SYNC_TOOL_COUNT is 19", () => {
    expect(SYNC_TOOL_COUNT).toBe(19);
  });

  it("ASYNC_TOOL_COUNT is 4", () => {
    expect(ASYNC_TOOL_COUNT).toBe(4);
  });

  it("TOTAL_TOOL_COUNT equals 23", () => {
    expect(TOTAL_TOOL_COUNT).toBe(23);
  });

  it("TOTAL_TOOL_COUNT matches ALL_TOOL_SCHEMAS key count", () => {
    expect(Object.keys(ALL_TOOL_SCHEMAS).length).toBe(TOTAL_TOOL_COUNT);
  });
});

describe("AC-006 response schema exports: all 23 response schemas are exported from @wechat-flow/contracts", () => {
  const ALL_RESPONSE_SCHEMAS: [string, ZodType][] = [
    ["renderMarkdownResponseSchema", renderMarkdownResponseSchema],
    ["lintMarkdownResponseSchema", lintMarkdownResponseSchema],
    ["listThemesResponseSchema", listThemesResponseSchema],
    ["describeThemeResponseSchema", describeThemeResponseSchema],
    ["listBlocksResponseSchema", listBlocksResponseSchema],
    ["describeBlockResponseSchema", describeBlockResponseSchema],
    ["listMarksResponseSchema", listMarksResponseSchema],
    ["describeMarkResponseSchema", describeMarkResponseSchema],
    ["listTokensResponseSchema", listTokensResponseSchema],
    ["describeTokenResponseSchema", describeTokenResponseSchema],
    ["listBlockVariantsResponseSchema", listBlockVariantsResponseSchema],
    ["describeVariantResponseSchema", describeVariantResponseSchema],
    ["derivePaletteResponseSchema", derivePaletteResponseSchema],
    ["applyZhTypoResponseSchema", applyZhTypoResponseSchema],
    ["simulatePasteResponseSchema", simulatePasteResponseSchema],
    ["exportClipboardPayloadResponseSchema", exportClipboardPayloadResponseSchema],
    ["getJobResponseSchema", getJobResponseSchema],
    ["getRulesetVersionResponseSchema", getRulesetVersionResponseSchema],
    ["describeTemplateResponseSchema", describeTemplateResponseSchema],
    ["uploadImageResponseSchema", uploadImageResponseSchema],
    ["uploadToWechatAssetResponseSchema", uploadToWechatAssetResponseSchema],
    ["exportLongImageResponseSchema", exportLongImageResponseSchema],
    ["exportCoverResponseSchema", exportCoverResponseSchema],
  ];

  it("exports exactly 23 response schemas", () => {
    expect(ALL_RESPONSE_SCHEMAS.length).toBe(23);
  });

  it("every response schema is a ZodType with a safeParse method", () => {
    for (const [name, schema] of ALL_RESPONSE_SCHEMAS) {
      expect(typeof schema.safeParse, `${name}.safeParse should be a function`).toBe("function");
    }
  });

  it("placeholder response schemas (passthrough) accept empty object", () => {
    const placeholders: [string, ZodType][] = ALL_RESPONSE_SCHEMAS.filter(
      ([name]) => name !== "renderMarkdownResponseSchema"
    );
    for (const [name, schema] of placeholders) {
      const result = schema.safeParse({});
      expect(result.success, `${name} should accept empty object`).toBe(true);
    }
  });

  it("renderMarkdownResponseSchema rejects invalid input and accepts valid payload", () => {
    const invalid = renderMarkdownResponseSchema.safeParse({});
    expect(invalid.success).toBe(false);

    const valid = renderMarkdownResponseSchema.safeParse({
      html: "<p>ok</p>",
      diagnostics: [],
      rulesetVersion: "1.0.0",
      themeVersion: "1.0.0",
      postPaste: false,
    });
    expect(valid.success).toBe(true);
  });
});
