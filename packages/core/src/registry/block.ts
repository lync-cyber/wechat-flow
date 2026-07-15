import type { Element } from "hast";
import type { ZodType } from "zod";
import { INTENTIONAL_PLAIN_VARIANTS } from "./intentional-plain-variants.ts";
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
  // Bare-directive rendering baseline for blocks whose variants[] omits a "default" entry.
  defaultStyle?: Record<string, Record<string, string>>;
  slots: string[];
  decorate?: (element: Element, ctx: BlockDecorateContext) => void;
}

export interface UnimplementedVariant {
  blockId: string;
  variantId: string;
  reason: string;
}

type VariantGuardMode = "collect" | "throw";

const store = new Map<string, BlockDefinition>();
const resetHooks: Array<() => void> = [];
const unimplementedCandidates = new Map<string, UnimplementedVariant>();
let variantGuardMode: VariantGuardMode = "collect";

function isVariantImplemented(definition: BlockDefinition, variant: BlockVariant): boolean {
  const hasBaseStyleDeclarations = variant.baseStyle
    ? Object.values(variant.baseStyle).some((slot) => Object.keys(slot).length > 0)
    : false;
  if (hasBaseStyleDeclarations) return true;
  if (definition.decorate) return true;
  return INTENTIONAL_PLAIN_VARIANTS.has(`${definition.id}::${variant.id}`);
}

function buildUnimplementedReason(blockId: string, variantId: string): string {
  return `variant "${variantId}" of block "${blockId}" has no implementation: add a baseStyle delta, add a decorate hook on the block, or register "${blockId}::${variantId}" in the intentional-plain-variants allowlist`;
}

function findUnimplementedVariants(definition: BlockDefinition): UnimplementedVariant[] {
  const found: UnimplementedVariant[] = [];
  for (const variant of definition.variants) {
    if (variant.id === "default") continue;
    if (isVariantImplemented(definition, variant)) continue;
    found.push({
      blockId: definition.id,
      variantId: variant.id,
      reason: buildUnimplementedReason(definition.id, variant.id),
    });
  }
  return found;
}

function clearUnimplementedForBlock(blockId: string): void {
  for (const [key, entry] of unimplementedCandidates) {
    if (entry.blockId === blockId) unimplementedCandidates.delete(key);
  }
}

export function getUnimplementedVariants(): UnimplementedVariant[] {
  return Array.from(unimplementedCandidates.values()).map((entry) => ({ ...entry }));
}

export function setVariantGuardMode(mode: VariantGuardMode): void {
  variantGuardMode = mode;
}

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
  if (definition.defaultStyle) {
    rejectedDeclarations.push(...validateForbiddenDeclarations(definition.defaultStyle));
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

  const unimplementedVariants = findUnimplementedVariants(definition);
  if (variantGuardMode === "throw" && unimplementedVariants.length > 0) {
    throw Object.assign(
      new Error(
        `E_VARIANT_NO_IMPL: block "${definition.id}" has unimplemented variant(s): ${unimplementedVariants
          .map((v) => v.variantId)
          .join(", ")}`
      ),
      { code: "E_VARIANT_NO_IMPL", unimplementedVariants }
    );
  }

  clearUnimplementedForBlock(definition.id);
  for (const candidate of unimplementedVariants) {
    unimplementedCandidates.set(`${candidate.blockId}::${candidate.variantId}`, candidate);
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
  unimplementedCandidates.clear();
  variantGuardMode = "collect";
  for (const hook of resetHooks) {
    hook();
  }
}
