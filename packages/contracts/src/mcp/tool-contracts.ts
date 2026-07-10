import { z } from "zod";
import { nightRiskEntrySchema, nodeChangeRecordSchema } from "../diagnostic/diagnostic-report.ts";
import { versionTripleSchema } from "../version/triple-structure.ts";
import { registerVariantRequestSchema } from "./register-variant.ts";

export const E_UNSUPPORTED_PLATFORM = "E_UNSUPPORTED_PLATFORM";

// ---- render_markdown (API-001) ----
export const renderMarkdownRequestSchema = z.object({
  markdown: z.string(),
  themeId: z.string().optional(),
  rulesetVersion: z.string().optional(),
  paint: z.record(z.string(), z.string()).optional(),
  baseColor: z.string().optional(),
  customCss: z.string().optional(),
  platform: z.enum(["wechat"]).optional(),
});

export const renderMarkdownResponseSchema = z.object({
  html: z.string(),
  diagnostics: z.array(z.looseObject({})),
  rulesetVersion: z.string(),
  themeVersion: z.string(),
  report: z.object({
    nodeChangeRecords: z.array(nodeChangeRecordSchema),
    nightRiskIssues: z.array(nightRiskEntrySchema),
  }),
  versionTriple: versionTripleSchema.optional(),
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

const tokenEntrySchema = z.object({
  id: z.string(),
  category: z.enum(["color", "spacing", "font", "decoration", "alignment"]),
  value: z.string(),
  themeOverrides: z.record(z.string(), z.string()).optional(),
});

// ---- list_tokens (API-009a) ----
export const listTokensRequestSchema = z.looseObject({});
export const listTokensResponseSchema = z.object({
  tokens: z.array(tokenEntrySchema),
});

// ---- describe_token (API-009b) ----
export const describeTokenRequestSchema = z.looseObject({});
export const describeTokenResponseSchema = tokenEntrySchema;

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

const patchSampleSchema = z.object({
  selector: z.string().optional(),
  before: z.string(),
});

const patchChangeSchema = z.object({
  patch: z.string(),
  label: z.string().optional(),
  count: z.number(),
  samples: z.array(patchSampleSchema),
});

// ---- simulate_paste (API-014) ----
export const simulatePasteRequestSchema = z.object({ html: z.string() });
export const simulatePasteResponseSchema = z.object({
  patchedHtml: z.string(),
  changes: z.array(patchChangeSchema),
  filteredHtml: z.string(),
});

// ---- export_clipboard_payload (API-015) ----
export const exportClipboardPayloadRequestSchema = z.looseObject({});
export const exportClipboardPayloadResponseSchema = z.object({
  html: z.string(),
  text: z.string(),
});

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
export const describeTemplateRequestSchema = z.object({
  themeId: z.string(),
  templateId: z.string(),
});
export const describeTemplateResponseSchema = z.union([
  z.object({
    themeId: z.string(),
    templateId: z.string(),
    markdown: z.string(),
    metadata: z.object({ description: z.string().optional() }),
    coveredElements: z.array(z.string()),
    coveredBlocks: z.array(z.string()),
    mdastSummary: z.object({
      totalNodes: z.number(),
      nodeCounts: z.record(z.string(), z.number()),
    }),
    dependencies: z.array(z.string()),
  }),
  z.object({ code: z.string() }),
]);

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

/**
 * Per-tool human-readable description surfaced to MCP clients via registerTool().
 */
export const TOOL_DESCRIPTIONS: Record<keyof typeof ALL_TOOL_SCHEMAS, string> = {
  render_markdown: "将 Markdown 渲染为微信公众号可直接粘贴的 inline-styled HTML",
  lint_markdown: "检查 Markdown 排版问题，不生成渲染产物",
  list_themes: "列出内置主题",
  describe_theme: "查询主题详情与可用模板列表",
  list_blocks: "列出已注册的 Block 组件",
  describe_block: "查询 Block 组件的属性 schema 与变体",
  list_marks: "列出已注册的 Mark 组件",
  describe_mark: "查询 Mark 组件的样式与属性 schema",
  list_tokens: "列出设计 Token",
  describe_token: "查询单个设计 Token 的实值",
  list_block_variants: "列出 Block 的已注册 Variant 皮肤",
  describe_variant: "查询 Variant 皮肤的样式与依赖",
  derive_palette: "由主色派生调色板",
  apply_zh_typo: "应用中文排版规范化规则",
  simulate_paste: "检查一段 HTML 中会被微信平台输出规则命中改写的部分",
  export_clipboard_payload: "导出可直接写入剪贴板的 html/text 双格式 payload",
  get_job: "查询异步任务状态",
  get_ruleset_version: "查询 core/theme/ruleset 三段版本号",
  describe_template: "查询主题模板正文与覆盖清单",
  register_variant: "注册自定义 Block Variant 皮肤",
  upload_image: "异步上传图片，返回 jobId",
  upload_to_wechat_asset: "异步上传微信素材库，返回 jobId",
  export_long_image: "异步导出长图，返回 jobId",
  export_cover: "异步导出封面图，返回 jobId",
};
