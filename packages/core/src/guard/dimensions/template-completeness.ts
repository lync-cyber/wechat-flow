import type { GuardFailure, ThemeDefinition } from "@wechat-flow/contracts";
import {
  validateTemplateCoverage,
  validateThemeTemplates,
} from "../../theme-guard/template-coverage.ts";

export function checkTemplateCompleteness(theme: ThemeDefinition): GuardFailure | null {
  // Prefer embedded templates array when present (avoids registry dependency)
  const embedded = theme.templates;
  if (embedded !== undefined) {
    if (embedded.length === 0) {
      return {
        dimension: "template-completeness",
        severity: "error",
        message: "Theme has no templates (empty array)",
      };
    }

    const failing: string[] = [];
    for (const tpl of embedded) {
      const coverage = validateTemplateCoverage(theme.id, tpl.templateId, tpl.markdown ?? "");
      if (!coverage.pass) {
        failing.push(tpl.templateId);
      }
    }

    if (failing.length === 0) return null;

    return {
      dimension: "template-completeness",
      severity: "error",
      message: `Templates failing coverage: ${failing.join(", ")}`,
    };
  }

  // Fallback to registry
  const result = validateThemeTemplates(theme.id);
  if (result.pass) return null;

  if (result.templates.length === 0) {
    return {
      dimension: "template-completeness",
      severity: "error",
      message: "Theme has no templates registered",
    };
  }

  return {
    dimension: "template-completeness",
    severity: "error",
    message: `Templates failing coverage: ${result.failingTemplates.join(", ")}`,
  };
}
