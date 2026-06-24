import type { TemplateDefinition } from "@wechat-flow/contracts";

export type TemplateMeta = {
  templateId: string;
  description: string | undefined;
};

export type CoverageReport = {
  pass: boolean;
  coveredElements: string[];
  missingElements: string[];
  coveredBlocks: string[];
  missingBlocks: string[];
};

const store = new Map<string, Map<string, TemplateDefinition>>();
const knownThemeIds = new Set<string>();

export function defineTemplate(input: {
  themeId: string;
  templateId: string;
  markdown: string;
  metadata: { description?: string };
}): void {
  const { themeId, templateId, markdown, metadata } = input;
  knownThemeIds.add(themeId);
  if (!store.has(themeId)) {
    store.set(themeId, new Map());
  }
  const themeMap = store.get(themeId);
  if (themeMap) {
    themeMap.set(templateId, { themeId, templateId, markdown, metadata });
  }
}

export function listThemeTemplates(themeId: string): TemplateMeta[] {
  const themeMap = store.get(themeId);
  if (!themeMap) return [];
  return Array.from(themeMap.values()).map((def) => ({
    templateId: def.templateId,
    description: def.metadata?.description,
  }));
}

export function describeTemplate(themeId: string, templateId: string): TemplateDefinition {
  if (!knownThemeIds.has(themeId)) throw new Error("E_THEME_NOT_FOUND");
  const themeMap = store.get(themeId);
  const def = themeMap?.get(templateId);
  if (!def) throw new Error("E_TEMPLATE_NOT_FOUND");
  return def;
}

export function resetTemplateRegistry(): void {
  store.clear();
  knownThemeIds.clear();
}
