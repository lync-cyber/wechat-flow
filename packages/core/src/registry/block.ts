import type { Element } from "hast";
import type { ZodType } from "zod";
import { buildRejectionError, validateForbiddenDeclarations } from "./style-guard.ts";

export type BlockCategory = "text" | "media" | "emphasis" | "structured" | "marketing" | "meta";

export type BlockSource = "builtin" | "plugin";

export interface BlockVariant {
  id: string;
  label?: string;
  baseStyle?: Record<string, Record<string, string>>;
}

export interface BlockDecorateContext {
  variant: string;
  attrs: Record<string, string>;
  docState: Record<string, unknown>;
}

export interface BlockDefinition {
  id: string;
  name: string;
  category: BlockCategory;
  source?: BlockSource;
  directiveAttrs: ZodType;
  directiveBody?: string;
  variants: BlockVariant[];
  baseStyle?: Record<string, Record<string, string>>;
  slots: string[];
  decorate?: (element: Element, ctx: BlockDecorateContext) => void;
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
  if (!definition.slots.includes("root")) {
    const err = Object.assign(
      new Error(`registerBlock: slots for block "${definition.id}" must include "root"`),
      { slot: "root", key: "root" }
    );
    throw err;
  }

  const rejectedDeclarations: ReturnType<typeof validateForbiddenDeclarations> = [];
  if (definition.baseStyle) {
    rejectedDeclarations.push(...validateForbiddenDeclarations(definition.baseStyle));
  }
  for (const variant of definition.variants) {
    if (variant.baseStyle) {
      rejectedDeclarations.push(...validateForbiddenDeclarations(variant.baseStyle));
    }
  }
  if (rejectedDeclarations.length > 0) {
    throw buildRejectionError(
      `registerBlock: rejected declarations for block "${definition.id}"`,
      rejectedDeclarations
    );
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
