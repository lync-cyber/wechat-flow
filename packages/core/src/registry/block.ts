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
  baseStyle?: Record<string, Record<string, string>>;
}

const store = new Map<string, BlockDefinition>();
const resetHooks: Array<() => void> = [];

export function registerBlock(definition: BlockDefinition): void {
  if (definition.baseStyle !== undefined && !("root" in definition.baseStyle)) {
    const err = Object.assign(
      new Error(`registerBlock: baseStyle for block "${definition.id}" must contain a "root" slot`),
      { slot: "root", key: "root" }
    );
    throw err;
  }
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
