import { z } from "zod";
import { versionTripleSchema } from "../version/triple-structure.ts";

export const attrDiffEntrySchema = z.object({
  attrName: z.string(),
  op: z.enum(["add", "remove", "modify", "keep"]),
  oldValue: z.string().optional(),
  newValue: z.string().optional(),
});

export const nodeChangeRecordSchema = z.object({
  nodeSelector: z.string(),
  before: z.string(),
  after: z.string(),
  attrDiff: z.array(attrDiffEntrySchema),
  triggerRuleId: z.string(),
});

export const nightRiskEntrySchema = z.object({
  nodeSelector: z.string(),
  contrastRatio: z.number(),
  foreground: z.string(),
  background: z.string(),
  suggestion: z.string(),
});

export const diagnosticSchema = z.object({
  severity: z.enum(["error", "warning", "info"]),
  ruleId: z.string(),
  message: z.string(),
  nodeRef: z.string().optional(),
});

export const diagnosticReportSchema = z.object({
  diagnostics: z.array(diagnosticSchema),
  nodeChangeRecords: z.array(nodeChangeRecordSchema),
  nightRiskIssues: z.array(nightRiskEntrySchema),
  versionTriple: versionTripleSchema,
});

export type AttrDiffEntry = z.infer<typeof attrDiffEntrySchema>;
export type NodeChangeRecord = z.infer<typeof nodeChangeRecordSchema>;
export type NightRiskEntry = z.infer<typeof nightRiskEntrySchema>;
export type Diagnostic = z.infer<typeof diagnosticSchema>;
export type DiagnosticReport = z.infer<typeof diagnosticReportSchema>;
