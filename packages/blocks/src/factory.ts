import type { BlockDefinition, BlockVariant } from "@wechat-flow/core/src/registry/block.ts";
import type { ZodType } from "zod";

export function defineBlock(
  id: string,
  name: string,
  attrsSchema: ZodType,
  variants: BlockVariant[]
): BlockDefinition {
  return { id, name, attrsSchema, variants };
}
