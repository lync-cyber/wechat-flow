import type { ThemeDefinition, ThemeListEntry } from "@wechat-flow/contracts";
import { mergeDelta } from "../inheritance/delta-merge.ts";
import {
  type RejectedDeclaration,
  buildRejectionError,
  validateThemeBlocksForbidden,
  validateThemeTokensForbidden,
} from "./style-guard.ts";
import { defineTemplate } from "./template.ts";

const store = new Map<string, ThemeDefinition>();

const getRaw = (id: string): ThemeDefinition | undefined => store.get(id);

export function registerTheme(definition: ThemeDefinition): void {
  const rejectedDeclarations: RejectedDeclaration[] = [];
  if (definition.tokens) {
    rejectedDeclarations.push(...validateThemeTokensForbidden(definition.tokens));
  }
  if (definition.blocks) {
    rejectedDeclarations.push(...validateThemeBlocksForbidden(definition.blocks));
  }
  if (rejectedDeclarations.length > 0) {
    throw buildRejectionError(
      `registerTheme: rejected declarations for theme "${definition.id}"`,
      rejectedDeclarations
    );
  }

  store.set(definition.id, {
    paintable: {},
    assets: {},
    ...definition,
  });
  for (const tpl of definition.templates ?? []) {
    defineTemplate({
      themeId: definition.id,
      templateId: tpl.templateId,
      name: tpl.name,
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
