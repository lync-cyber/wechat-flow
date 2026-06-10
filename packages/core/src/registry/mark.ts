export interface MarkDefinition {
  id: string;
  name: string;
}

const store = new Map<string, MarkDefinition>();

export function registerMark(definition: MarkDefinition): void {
  store.set(definition.id, definition);
}

export function listMarks(): MarkDefinition[] {
  return Array.from(store.values());
}

export function describeMark(id: string): MarkDefinition | undefined {
  return store.get(id);
}

export function resetMarkRegistry(): void {
  store.clear();
}
