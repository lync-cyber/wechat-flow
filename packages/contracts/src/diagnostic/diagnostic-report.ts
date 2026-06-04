import { z } from "zod";

export const diagnosticSchema = z.object({}).passthrough();

export const nodeChangeRecordSchema = z.object({}).passthrough();

export const nightRiskIssueSchema = z.object({}).passthrough();

export const diagnosticReportSchema = z.object({
  diagnostics: z.array(diagnosticSchema),
  nodeChangeRecords: z.array(nodeChangeRecordSchema),
  nightRiskIssues: z.array(nightRiskIssueSchema),
});

export type DiagnosticReport = z.infer<typeof diagnosticReportSchema>;
