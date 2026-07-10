import { buildRejectionError, validateMarkStyleForbidden } from "./style-guard.ts";

export interface MarkDefinition {
  id: string;
  name: string;
  style: string;
}

const store = new Map<string, MarkDefinition>();
const resetHooks: Array<() => void> = [];

export function registerMark(definition: MarkDefinition): void {
  const rejectedDeclarations = validateMarkStyleForbidden(definition.style);
  if (rejectedDeclarations.length > 0) {
    throw buildRejectionError(
      `registerMark: rejected declarations for mark "${definition.id}"`,
      rejectedDeclarations
    );
  }
  store.set(definition.id, definition);
}

export function listMarks(): MarkDefinition[] {
  return Array.from(store.values());
}

export function describeMark(id: string): MarkDefinition | undefined {
  return store.get(id);
}

export function onMarkRegistryReset(hook: () => void): void {
  resetHooks.push(hook);
}

export function resetMarkRegistry(): void {
  store.clear();
  for (const hook of resetHooks) {
    hook();
  }
}
