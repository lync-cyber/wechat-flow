import type { ThemeDefinition, ThemeListEntry } from "@wechat-flow/contracts";

const store = new Map<string, ThemeDefinition>();

export function registerTheme(definition: ThemeDefinition): void {
  store.set(definition.id, {
    paintable: {},
    assets: {},
    ...definition,
  });
}

export function listThemes(): ThemeListEntry[] {
  return Array.from(store.values()).map(({ id, name }) => ({ id, name }));
}

export function describeTheme(id: string): ThemeDefinition | undefined {
  return store.get(id);
}

export function resetThemeRegistry(): void {
  store.clear();
}
