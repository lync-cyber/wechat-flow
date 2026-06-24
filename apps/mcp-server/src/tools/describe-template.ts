// API-033 rich fields (coveredElements / mdastSummary / dependencies) are deferred to a future sprint.
import { describeTemplate, describeTheme } from "@wechat-flow/core";

export function describeTemplateTool(args: Record<string, unknown>) {
  const themeId = String(args.themeId ?? "");
  const templateId = String(args.templateId ?? "");
  try {
    const def = describeTemplate(themeId, templateId);
    return {
      themeId: def.themeId,
      templateId: def.templateId,
      markdown: def.markdown,
      metadata: def.metadata,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "E_TEMPLATE_NOT_FOUND") {
      if (!describeTheme(themeId)) return { code: "E_THEME_NOT_FOUND" };
      return { code: "E_TEMPLATE_NOT_FOUND" };
    }
    throw err;
  }
}
