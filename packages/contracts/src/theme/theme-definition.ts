import { z } from "zod";

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

export const themeDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  tokens: themeTokensSchema,
  blocks: themeBlocksSchema.optional(),
  paintable: paintableSchema.optional(),
  assets: z.record(z.string(), z.unknown()).optional(),
  meta: themeMetaSchema.optional(),
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
export type ThemeDefinition = z.infer<typeof themeDefinitionSchema>;
export type ThemeListEntry = z.infer<typeof themeListEntrySchema>;
export type GuardFailure = z.infer<typeof guardFailureSchema>;
export type GuardResult = z.infer<typeof guardResultSchema>;
