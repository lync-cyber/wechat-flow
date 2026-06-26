import { filterCssAttrs } from "../pipeline/css-attr-filter.ts";
import { describeBlock, listBlocks } from "./block.ts";
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

function schemaError(message: string): Error {
  return Object.assign(new Error(`E_SCHEMA: ${message}`), { code: "E_SCHEMA" });
}

function assertValidInput(input: VariantRegistrationInput): void {
  if (input.blockId.trim() === "") throw schemaError("blockId must be a non-empty string");
  if (input.id.trim() === "") throw schemaError("variantId must be a non-empty string");
  if (input.label.trim() === "") throw schemaError("label must be a non-empty string");
  if (
    input.style === null ||
    typeof input.style !== "object" ||
    Object.keys(input.style).length === 0
  ) {
    throw schemaError("style must be a non-empty map of slot to declarations");
  }
  for (const [slot, declarations] of Object.entries(input.style)) {
    if (declarations === null || typeof declarations !== "object") {
      throw schemaError(`style slot "${slot}" must map to a declaration record`);
    }
  }
}

export function registerVariant(input: VariantRegistrationInput): void {
  assertValidInput(input);

  const blockDef = describeBlock(input.blockId);
  if (!blockDef) {
    throw Object.assign(
      new Error(`E_BLOCK_NOT_FOUND: block "${input.blockId}" is not registered`),
      {
        code: "E_BLOCK_NOT_FOUND",
      }
    );
  }

  const unknownSlots = Object.keys(input.style).filter((slot) => !blockDef.slots.includes(slot));
  if (unknownSlots.length > 0) {
    throw Object.assign(
      new Error(
        `E_SLOT_UNKNOWN: block "${input.blockId}" does not declare slot(s): ${unknownSlots.join(", ")}`
      ),
      { code: "E_SLOT_UNKNOWN", unknownSlots }
    );
  }

  const rejectedDeclarations = validateStyle(input.style);
  if (rejectedDeclarations.length > 0) {
    const err = Object.assign(
      new Error(`registerVariant: rejected declarations in variant "${input.id}"`),
      { rejectedDeclarations }
    );
    throw err;
  }

  const key = `${input.blockId}::${input.id}`;
  const conflictsWithBuiltin = blockDef.variants.some((v) => v.id === input.id);
  if (conflictsWithBuiltin || store.has(key)) {
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

export function listAllVariants(): Array<{ blockId: string; id: string; label?: string }> {
  const result: Array<{ blockId: string; id: string; label?: string }> = [];
  for (const block of listBlocks()) {
    for (const v of block.variants) {
      result.push({ blockId: block.id, id: v.id, label: v.label });
    }
  }
  for (const v of store.values()) {
    result.push({ blockId: v.blockId, id: v.id, label: v.label });
  }
  return result;
}

export function resetVariantRegistry(): void {
  store.clear();
}
