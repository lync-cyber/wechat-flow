import type { DiagnosticReport, renderMarkdownResponseSchema } from "@wechat-flow/contracts";
import type { RuleDefinition } from "@wechat-flow/ruleset";
import type { z } from "zod";

export type RenderResult = z.infer<typeof renderMarkdownResponseSchema> & {
  coreVersion: string;
  report: DiagnosticReport;
};

export interface RenderOptions {
  themeId?: string;
  rulesetVersion?: string;
  injectNodeIds?: boolean;
  rules?: RuleDefinition[];
}
