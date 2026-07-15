export { renderMarkdown } from "./render.ts";
export {
  contextAwareRender,
  withinBlock,
} from "./pipeline/context-aware-renderer.ts";
export {
  injectDecorations,
  resolveTokenPlaceholders,
} from "./pipeline/decoration-injector.ts";
export { parseMarkdown } from "./pipeline/parse.ts";
export { transformToHast } from "./pipeline/transform.ts";
export { serializeHast } from "./pipeline/serialize.ts";
export { inlineStyle } from "./pipeline/inline-style.ts";
export { filterCssAttrs } from "./pipeline/css-attr-filter.ts";
export { coreVersion, getVersionTriple } from "./version/triple.ts";
export { verifyDeterminism } from "./verify-determinism.ts";
export type { RenderResult, RenderOptions } from "./types.ts";
export type { BlockStyleTable } from "./pipeline/inline-style.ts";
export {
  sortedKeys,
  sortedEntries,
  sortedSet,
  canonicalStringify,
} from "./utils/deterministic.ts";
export {
  saveDraft,
  loadDocument,
  listDocuments,
  deleteDocument,
  duplicateDocument,
} from "./documents/manager.ts";
export {
  createBackup,
  listBackups,
  deleteBackupsForDoc,
  MAX_BACKUPS_PER_DOC,
} from "./backup/auto-backup.ts";
export type { BackupRecord } from "./storage/indexeddb-adapter.ts";
export { saveSplitterWidth, loadSplitterWidth } from "./storage/preferences.ts";
export { saveLeftPanelCollapsed, loadLeftPanelCollapsed } from "./storage/preferences.ts";
export {
  saveEditorPreferences,
  loadEditorPreferences,
} from "./storage/preferences.ts";
export type { EditorPreferences } from "./storage/preferences.ts";
export {
  saveCredential,
  loadCredential,
  loadCredentialGroup,
  clearCredential,
} from "./storage/credentials.ts";
export { closeDb } from "./storage/indexeddb-adapter.ts";
export type { DocumentRecord, DocumentMeta } from "./storage/indexeddb-adapter.ts";
export { wechatAdapter } from "./platform/wechat-adapter.ts";
export type { PlatformAdapter } from "./platform/wechat-adapter.ts";
export {
  registerBlock,
  listBlocks,
  describeBlock,
  onRegistryReset,
  resetBlockRegistry,
  getUnimplementedVariants,
  setVariantGuardMode,
} from "./registry/block.ts";
export type {
  BlockCategory,
  BlockDecorateContext,
  BlockDefinition,
  BlockSource,
  BlockVariant,
  UnimplementedVariant,
} from "./registry/block.ts";
export { INTENTIONAL_PLAIN_VARIANTS } from "./registry/intentional-plain-variants.ts";
export { runVariantDiffGuard } from "./registry/variant-diff-guard.ts";
export type {
  VariantDiffFinding,
  VariantDiffGuardOptions,
} from "./registry/variant-diff-guard.ts";
export {
  registerMark,
  listMarks,
  describeMark,
  onMarkRegistryReset,
  resetMarkRegistry,
} from "./registry/mark.ts";
export type { MarkDefinition } from "./registry/mark.ts";
export {
  registerTheme,
  listThemes,
  describeTheme,
  resetThemeRegistry,
} from "./registry/theme.ts";
export type { ThemeDefinition, ThemeListEntry } from "@wechat-flow/contracts";
export {
  registerVariant,
  listBlockVariants,
  listAllVariants,
  describeVariant,
  getBlockBaseStyle,
  resetVariantRegistry,
} from "./registry/variant.ts";
export type { VariantDefinition, RejectedDeclaration } from "./registry/variant.ts";
export {
  CSS_SAFE_PROPERTIES,
  isWhitelistedProperty,
} from "./registry/css-property-whitelist.ts";
export {
  defineTemplate,
  listThemeTemplates,
  describeTemplate,
  resetTemplateRegistry,
} from "./registry/template.ts";
export type { TemplateMeta, CoverageReport } from "./registry/template.ts";
export {
  describeTemplateDetailed,
  validateTemplateCoverage,
  validateThemeTemplates,
} from "./theme-guard/template-coverage.ts";
export type {
  MdastSummary,
  TemplateDetail,
  ThemeTemplateValidationResult,
} from "./theme-guard/template-coverage.ts";
export { composeApplyZhTypo } from "./composers/apply-zh-typo.ts";
export type { ZhTypoComposerResult, DiffEntry } from "./composers/apply-zh-typo.ts";
export {
  composeUploadWechatAsset,
  subscribeJob,
  ValidationError,
} from "./composers/upload-wechat-asset.ts";
export type {
  WechatAssetType,
  JobHandle,
  WechatAssetRelayClient,
  EventSourceFactory,
} from "./composers/upload-wechat-asset.ts";
export {
  registerToken,
  listTokens,
  describeToken,
  resetTokenRegistry,
  seedTokenRegistry,
} from "./registry/token.ts";
export type { TokenDefinition } from "./registry/token.ts";
export {
  parseFrontmatter,
  upsertFrontmatterPaint,
} from "./pipeline/frontmatter.ts";
export type { FrontmatterMeta, FrontmatterResult } from "./pipeline/frontmatter.ts";
