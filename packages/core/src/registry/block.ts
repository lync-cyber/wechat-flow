import type { ZodType } from "zod";

export interface BlockVariant {
  id: string;
  label?: string;
}

export interface BlockDefinition {
  id: string;
  name: string;
  attrsSchema: ZodType;
  variants: BlockVariant[];
}

const store = new Map<string, BlockDefinition>();
const resetHooks: Array<() => void> = [];

export function registerBlock(definition: BlockDefinition): void {
  store.set(definition.id, definition);
}

export function listBlocks(): BlockDefinition[] {
  return Array.from(store.values());
}

export function describeBlock(id: string): BlockDefinition | undefined {
  return store.get(id);
}

export function onRegistryReset(hook: () => void): void {
  resetHooks.push(hook);
}

export function resetBlockRegistry(): void {
  store.clear();
  for (const hook of resetHooks) {
    hook();
  }
}
