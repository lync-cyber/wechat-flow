export interface BlockDefinition {
  id: string;
  name: string;
}

const store = new Map<string, BlockDefinition>();

export function registerBlock(definition: BlockDefinition): void {
  store.set(definition.id, definition);
}

export function listBlocks(): BlockDefinition[] {
  return Array.from(store.values());
}

export function describeBlock(id: string): BlockDefinition | undefined {
  return store.get(id);
}

export function resetBlockRegistry(): void {
  store.clear();
}
