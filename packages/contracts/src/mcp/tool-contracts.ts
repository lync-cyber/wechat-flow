import { z } from "zod";
import { registerVariantRequestSchema } from "./register-variant.ts";

// ---- render_markdown (API-001) ----
export const renderMarkdownRequestSchema = z.object({
  markdown: z.string(),
  themeId: z.string().optional(),
  rulesetVersion: z.string().optional(),
  paint: z.record(z.string(), z.string()).optional(),
  baseColor: z.string().optional(),
  customCss: z.string().optional(),
});

export const renderMarkdownResponseSchema = z.object({
  html: z.string(),
  diagnostics: z.array(z.looseObject({})),
  rulesetVersion: z.string(),
  themeVersion: z.string(),
  postPaste: z.boolean(),
});

// ---- lint_markdown (API-002) ----
export const lintMarkdownRequestSchema = z.looseObject({});
export const lintMarkdownResponseSchema = z.looseObject({});

// ---- list_themes (API-003) ----
export const listThemesRequestSchema = z.looseObject({});
export const listThemesResponseSchema = z.looseObject({});

// ---- describe_theme (API-004) ----
export const describeThemeRequestSchema = z.looseObject({});
export const describeThemeResponseSchema = z.looseObject({});

// ---- list_blocks (API-005) ----
export const listBlocksRequestSchema = z.looseObject({});
export const listBlocksResponseSchema = z.looseObject({});

// ---- describe_block (API-006) ----
export const describeBlockRequestSchema = z.looseObject({});
export const describeBlockResponseSchema = z.looseObject({});

// ---- list_marks (API-007) ----
export const listMarksRequestSchema = z.looseObject({});
export const listMarksResponseSchema = z.looseObject({});

// ---- describe_mark (API-008) ----
export const describeMarkRequestSchema = z.looseObject({});
export const describeMarkResponseSchema = z.looseObject({});

// ---- list_tokens (API-009a) ----
export const listTokensRequestSchema = z.looseObject({});
export const listTokensResponseSchema = z.looseObject({});

// ---- describe_token (API-009b) ----
export const describeTokenRequestSchema = z.looseObject({});
export const describeTokenResponseSchema = z.looseObject({});

// ---- list_block_variants (API-010) ----
export const listBlockVariantsRequestSchema = z.looseObject({});
export const listBlockVariantsResponseSchema = z.looseObject({});

// ---- describe_variant (API-011) ----
export const describeVariantRequestSchema = z.looseObject({});
export const describeVariantResponseSchema = z.looseObject({});

// ---- derive_palette (API-012) ----
export const derivePaletteRequestSchema = z.looseObject({});
export const derivePaletteResponseSchema = z.looseObject({});

// ---- apply_zh_typo (API-013) ----
export const applyZhTypoRequestSchema = z.looseObject({});
export const applyZhTypoResponseSchema = z.looseObject({});

// ---- simulate_paste (API-014) ----
export const simulatePasteRequestSchema = z.looseObject({});
export const simulatePasteResponseSchema = z.looseObject({});

// ---- export_clipboard_payload (API-015) ----
export const exportClipboardPayloadRequestSchema = z.looseObject({});
export const exportClipboardPayloadResponseSchema = z.looseObject({});

// ---- upload_image async (API-016a) ----
export const uploadImageRequestSchema = z.looseObject({});
export const uploadImageResponseSchema = z.looseObject({});

// ---- upload_to_wechat_asset async (API-016b) ----
export const uploadToWechatAssetRequestSchema = z.looseObject({});
export const uploadToWechatAssetResponseSchema = z.looseObject({});

// ---- export_long_image async (API-016c) ----
export const exportLongImageRequestSchema = z.looseObject({});
export const exportLongImageResponseSchema = z.looseObject({});

// ---- export_cover async (API-016d) ----
export const exportCoverRequestSchema = z.looseObject({});
export const exportCoverResponseSchema = z.looseObject({});

// ---- get_job (API-016e) ----
export const getJobRequestSchema = z.looseObject({});
export const getJobResponseSchema = z.looseObject({});

// ---- get_ruleset_version (API-016f) ----
export const getRulesetVersionRequestSchema = z.looseObject({});
export const getRulesetVersionResponseSchema = z.looseObject({});

// ---- describe_template (API-033) ----
export const describeTemplateRequestSchema = z.looseObject({});
export const describeTemplateResponseSchema = z.looseObject({});

/**
 * Registry of all 24 Tool request schemas (20 sync + 4 async).
 * Used by AC-005 count verification.
 */
export const ALL_TOOL_SCHEMAS = {
  // sync (20)
  render_markdown: renderMarkdownRequestSchema,
  lint_markdown: lintMarkdownRequestSchema,
  list_themes: listThemesRequestSchema,
  describe_theme: describeThemeRequestSchema,
  list_blocks: listBlocksRequestSchema,
  describe_block: describeBlockRequestSchema,
  list_marks: listMarksRequestSchema,
  describe_mark: describeMarkRequestSchema,
  list_tokens: listTokensRequestSchema,
  describe_token: describeTokenRequestSchema,
  list_block_variants: listBlockVariantsRequestSchema,
  describe_variant: describeVariantRequestSchema,
  derive_palette: derivePaletteRequestSchema,
  apply_zh_typo: applyZhTypoRequestSchema,
  simulate_paste: simulatePasteRequestSchema,
  export_clipboard_payload: exportClipboardPayloadRequestSchema,
  get_job: getJobRequestSchema,
  get_ruleset_version: getRulesetVersionRequestSchema,
  describe_template: describeTemplateRequestSchema,
  register_variant: registerVariantRequestSchema,
  // async (4)
  upload_image: uploadImageRequestSchema,
  upload_to_wechat_asset: uploadToWechatAssetRequestSchema,
  export_long_image: exportLongImageRequestSchema,
  export_cover: exportCoverRequestSchema,
} as const;

export const SYNC_TOOL_COUNT = 20;
export const ASYNC_TOOL_COUNT = 4;
export const TOTAL_TOOL_COUNT = SYNC_TOOL_COUNT + ASYNC_TOOL_COUNT;
