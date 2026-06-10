import { z } from "zod";

// ---- render_markdown (API-001) ----
export const renderMarkdownRequestSchema = z.object({
  markdown: z.string(),
  themeId: z.string().optional(),
  rulesetVersion: z.string().optional(),
  paint: z.record(z.string(), z.string()).optional(),
  baseColor: z.string().optional(),
});

export const renderMarkdownResponseSchema = z.object({
  html: z.string(),
  diagnostics: z.array(z.object({}).passthrough()),
  rulesetVersion: z.string(),
  themeVersion: z.string(),
  postPaste: z.boolean(),
});

// ---- lint_markdown (API-002) ----
export const lintMarkdownRequestSchema = z.object({}).passthrough();
export const lintMarkdownResponseSchema = z.object({}).passthrough();

// ---- list_themes (API-003) ----
export const listThemesRequestSchema = z.object({}).passthrough();
export const listThemesResponseSchema = z.object({}).passthrough();

// ---- describe_theme (API-004) ----
export const describeThemeRequestSchema = z.object({}).passthrough();
export const describeThemeResponseSchema = z.object({}).passthrough();

// ---- list_blocks (API-005) ----
export const listBlocksRequestSchema = z.object({}).passthrough();
export const listBlocksResponseSchema = z.object({}).passthrough();

// ---- describe_block (API-006) ----
export const describeBlockRequestSchema = z.object({}).passthrough();
export const describeBlockResponseSchema = z.object({}).passthrough();

// ---- list_marks (API-007) ----
export const listMarksRequestSchema = z.object({}).passthrough();
export const listMarksResponseSchema = z.object({}).passthrough();

// ---- describe_mark (API-008) ----
export const describeMarkRequestSchema = z.object({}).passthrough();
export const describeMarkResponseSchema = z.object({}).passthrough();

// ---- list_tokens (API-009a) ----
export const listTokensRequestSchema = z.object({}).passthrough();
export const listTokensResponseSchema = z.object({}).passthrough();

// ---- describe_token (API-009b) ----
export const describeTokenRequestSchema = z.object({}).passthrough();
export const describeTokenResponseSchema = z.object({}).passthrough();

// ---- list_block_variants (API-010) ----
export const listBlockVariantsRequestSchema = z.object({}).passthrough();
export const listBlockVariantsResponseSchema = z.object({}).passthrough();

// ---- describe_variant (API-011) ----
export const describeVariantRequestSchema = z.object({}).passthrough();
export const describeVariantResponseSchema = z.object({}).passthrough();

// ---- derive_palette (API-012) ----
export const derivePaletteRequestSchema = z.object({}).passthrough();
export const derivePaletteResponseSchema = z.object({}).passthrough();

// ---- apply_zh_typo (API-013) ----
export const applyZhTypoRequestSchema = z.object({}).passthrough();
export const applyZhTypoResponseSchema = z.object({}).passthrough();

// ---- simulate_paste (API-014) ----
export const simulatePasteRequestSchema = z.object({}).passthrough();
export const simulatePasteResponseSchema = z.object({}).passthrough();

// ---- export_clipboard_payload (API-015) ----
export const exportClipboardPayloadRequestSchema = z.object({}).passthrough();
export const exportClipboardPayloadResponseSchema = z.object({}).passthrough();

// ---- upload_image async (API-016a) ----
export const uploadImageRequestSchema = z.object({}).passthrough();
export const uploadImageResponseSchema = z.object({}).passthrough();

// ---- upload_to_wechat_asset async (API-016b) ----
export const uploadToWechatAssetRequestSchema = z.object({}).passthrough();
export const uploadToWechatAssetResponseSchema = z.object({}).passthrough();

// ---- export_long_image async (API-016c) ----
export const exportLongImageRequestSchema = z.object({}).passthrough();
export const exportLongImageResponseSchema = z.object({}).passthrough();

// ---- export_cover async (API-016d) ----
export const exportCoverRequestSchema = z.object({}).passthrough();
export const exportCoverResponseSchema = z.object({}).passthrough();

// ---- get_job (API-016e) ----
export const getJobRequestSchema = z.object({}).passthrough();
export const getJobResponseSchema = z.object({}).passthrough();

// ---- get_ruleset_version (API-016f) ----
export const getRulesetVersionRequestSchema = z.object({}).passthrough();
export const getRulesetVersionResponseSchema = z.object({}).passthrough();

// ---- describe_template (API-033) ----
export const describeTemplateRequestSchema = z.object({}).passthrough();
export const describeTemplateResponseSchema = z.object({}).passthrough();

/**
 * Registry of all 23 Tool request schemas (19 sync + 4 async).
 * Used by AC-006 count verification.
 */
export const ALL_TOOL_SCHEMAS = {
  // sync (19)
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
  // async (4)
  upload_image: uploadImageRequestSchema,
  upload_to_wechat_asset: uploadToWechatAssetRequestSchema,
  export_long_image: exportLongImageRequestSchema,
  export_cover: exportCoverRequestSchema,
} as const;

export const SYNC_TOOL_COUNT = 19;
export const ASYNC_TOOL_COUNT = 4;
export const TOTAL_TOOL_COUNT = SYNC_TOOL_COUNT + ASYNC_TOOL_COUNT;
