import { describeTemplate } from "@wechat-flow/core";

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
    if (msg === "E_THEME_NOT_FOUND" || msg === "E_TEMPLATE_NOT_FOUND") {
      return { code: msg };
    }
    throw err;
  }
}
