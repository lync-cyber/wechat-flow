import { filterCssAttrs } from "../pipeline/css-attr-filter.ts";
import { describeBlock } from "./block.ts";
import { isWhitelistedProperty } from "./css-property-whitelist.ts";

export interface RejectedDeclaration {
  slot: string;
  property: string;
  value: string;
  reason: string;
}

export interface VariantDefinition {
  id: string;
  blockId: string;
  label: string;
  style: Record<string, Record<string, string>>;
}

export interface VariantRegistrationInput {
  blockId: string;
  id: string;
  label: string;
  style: Record<string, Record<string, string>>;
}

const store = new Map<string, VariantDefinition>();

function validateStyle(style: Record<string, Record<string, string>>): RejectedDeclaration[] {
  const rejected: RejectedDeclaration[] = [];
  for (const [slot, declarations] of Object.entries(style)) {
    for (const [property, value] of Object.entries(declarations)) {
      const filtered = filterCssAttrs(`${property}: ${value}`);
      if (filtered === "") {
        rejected.push({
          slot,
          property,
          value,
          reason: "not in css-attr-filter whitelist: blocked by XSS filter",
        });
        continue;
      }
      if (!isWhitelistedProperty(property)) {
        rejected.push({
          slot,
          property,
          value,
          reason: `not in css-attr-filter whitelist: property "${property}" is not allowed`,
        });
      }
    }
  }
  return rejected;
}

export function registerVariant(input: VariantRegistrationInput): void {
  const rejectedDeclarations = validateStyle(input.style);
  if (rejectedDeclarations.length > 0) {
    const err = Object.assign(
      new Error(`registerVariant: rejected declarations in variant "${input.id}"`),
      { rejectedDeclarations }
    );
    throw err;
  }

  const key = `${input.blockId}::${input.id}`;
  if (store.has(key)) {
    const err = Object.assign(
      new Error(
        `E_VARIANT_CONFLICT: variant "${input.id}" is already registered for block "${input.blockId}"`
      ),
      { code: "E_VARIANT_CONFLICT" }
    );
    throw err;
  }

  store.set(key, {
    id: input.id,
    blockId: input.blockId,
    label: input.label,
    style: input.style,
  });
}

export function listBlockVariants(blockId: string): Array<{ id: string; label: string }> {
  return Array.from(store.values())
    .filter((v) => v.blockId === blockId)
    .map((v) => ({ id: v.id, label: v.label }));
}

export function describeVariant(id: string): VariantDefinition | undefined {
  for (const v of store.values()) {
    if (v.id === id) return v;
  }
  return undefined;
}

export function getBlockBaseStyle(blockId: string, variantId: string): Record<string, string> {
  if (variantId === "default") {
    const blockDef = describeBlock(blockId);
    return blockDef?.baseStyle?.root ?? {};
  }
  const key = `${blockId}::${variantId}`;
  const entry = store.get(key);
  return entry?.style?.root ?? {};
}

export function resetVariantRegistry(): void {
  store.clear();
}
