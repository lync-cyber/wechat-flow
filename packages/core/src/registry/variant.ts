export interface VariantDefinition {
  id: string;
  blockId: string;
  name: string;
}

const store = new Map<string, VariantDefinition>();

export function registerVariant(definition: VariantDefinition): void {
  store.set(definition.id, definition);
}

export function listBlockVariants(blockId: string): VariantDefinition[] {
  return Array.from(store.values()).filter((v) => v.blockId === blockId);
}

export function describeVariant(id: string): VariantDefinition | undefined {
  return store.get(id);
}

export function resetVariantRegistry(): void {
  store.clear();
}
