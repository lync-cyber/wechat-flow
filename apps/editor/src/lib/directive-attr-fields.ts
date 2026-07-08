import type { BlockDefinition } from "@wechat-flow/core";

export function getDirectiveAttrFields(block: BlockDefinition): string[] {
  try {
    const shape = (block.directiveAttrs as { shape?: Record<string, unknown> }).shape;
    return shape ? Object.keys(shape) : [];
  } catch {
    return [];
  }
}
