import { z } from "zod";
import { templateDefinitionSchema } from "./template-definition.ts";

export const themeTokensSchema = z.record(z.string(), z.string());

export const wcagContrastMetaSchema = z.object({
  checked: z.boolean(),
  minRatio: z.number(),
});

export const themeMetaSchema = z.object({
  author: z.string().optional(),
  version: z.string().optional(),
  wcagContrast: wcagContrastMetaSchema.optional(),
});

export const themeBlocksSchema = z.record(
  z.string(),
  z.record(z.string(), z.record(z.string(), z.string()))
);

// paintable: list of CSS custom property names that paint overrides may target;
// empty array (or empty object for legacy compat) means no properties are paintable.
export const paintableSchema = z.union([z.array(z.string()), z.record(z.string(), z.unknown())]);

export const themeDeltaSchema = z.object({
  tokens: themeTokensSchema.optional(),
  blocks: themeBlocksSchema.optional(),
  paintable: paintableSchema.optional(),
  assets: z.record(z.string(), z.unknown()).optional(),
});

export const brandPackSchema = z.object({
  lockedTokens: z.array(z.string()),
  lockedBlocks: z.array(z.string()).optional(),
});

export const themeDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  tokens: themeTokensSchema,
  blocks: themeBlocksSchema.optional(),
  paintable: paintableSchema.optional(),
  assets: z.record(z.string(), z.unknown()).optional(),
  meta: themeMetaSchema.optional(),
  templates: z.array(templateDefinitionSchema).optional(),
  extends: z.string().optional(),
  delta: themeDeltaSchema.optional(),
  brandPack: brandPackSchema.optional(),
});

export const themeListEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const guardFailureSchema = z.object({
  dimension: z.string(),
  severity: z.enum(["error", "warning", "info"]),
  message: z.string().optional(),
});

export const guardResultSchema = z.object({
  passed: z.boolean(),
  failures: z.array(guardFailureSchema),
});

export type ThemeTokens = z.infer<typeof themeTokensSchema>;
export type ThemeMeta = z.infer<typeof themeMetaSchema>;
export type ThemeBlocks = z.infer<typeof themeBlocksSchema>;
export type ThemeDelta = z.infer<typeof themeDeltaSchema>;
export type BrandPack = z.infer<typeof brandPackSchema>;
export type ThemeDefinition = z.infer<typeof themeDefinitionSchema>;
export type ThemeListEntry = z.infer<typeof themeListEntrySchema>;
export type GuardFailure = z.infer<typeof guardFailureSchema>;
export type GuardResult = z.infer<typeof guardResultSchema>;
