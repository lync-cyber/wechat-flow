import type { ThemeDefinition, ThemeListEntry } from "@wechat-flow/contracts";
import { mergeDelta } from "../inheritance/delta-merge.ts";
import { defineTemplate } from "./template.ts";

const store = new Map<string, ThemeDefinition>();

const getRaw = (id: string): ThemeDefinition | undefined => store.get(id);

export function registerTheme(definition: ThemeDefinition): void {
  store.set(definition.id, {
    paintable: {},
    assets: {},
    ...definition,
  });
  for (const tpl of definition.templates ?? []) {
    defineTemplate({
      themeId: definition.id,
      templateId: tpl.templateId,
      markdown: tpl.markdown ?? "",
      metadata: tpl.metadata ?? {},
    });
  }
}

export function listThemes(): ThemeListEntry[] {
  return Array.from(store.values()).map(({ id, name }) => ({ id, name }));
}

export function describeTheme(id: string): ThemeDefinition | undefined {
  return mergeDelta(id, getRaw);
}

export function resetThemeRegistry(): void {
  store.clear();
}
