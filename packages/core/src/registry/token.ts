export interface TokenDefinition {
  name: string;
  description?: string;
  defaultValue?: string;
}

const store = new Map<string, TokenDefinition>();

export function registerToken(definition: TokenDefinition): void {
  store.set(definition.name, definition);
}

export function listTokens(): TokenDefinition[] {
  return Array.from(store.values());
}

export function describeToken(name: string): TokenDefinition | undefined {
  return store.get(name);
}

export function resetTokenRegistry(): void {
  store.clear();
}
