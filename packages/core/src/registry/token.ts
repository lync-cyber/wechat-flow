import { DESIGN_TOKENS } from "./token-seed.ts";
import type { TokenDefinition } from "./token-types.ts";

export type { TokenDefinition };

const store = new Map<string, TokenDefinition>();

export function registerToken(definition: TokenDefinition): void {
  store.set(definition.id, definition);
}

export function listTokens(): TokenDefinition[] {
  return Array.from(store.values());
}

export function describeToken(id: string): TokenDefinition | undefined {
  return store.get(id);
}

export function resetTokenRegistry(): void {
  store.clear();
}

export function seedTokenRegistry(): void {
  for (const token of DESIGN_TOKENS) {
    registerToken(token);
  }
}

seedTokenRegistry();
