import type { BlockCategory, BlockDefinition, BlockVariant } from "@wechat-flow/core";
import type { ZodType } from "zod";

export function defineBlock(
  id: string,
  name: string,
  attrsSchema: ZodType,
  category: BlockCategory,
  variants: BlockVariant[],
  baseStyle?: Record<string, Record<string, string>>,
  slots?: string[]
): BlockDefinition {
  const resolvedSlots = slots ?? Array.from(new Set(["root", ...Object.keys(baseStyle ?? {})]));
  return { id, name, attrsSchema, category, variants, baseStyle, slots: resolvedSlots };
}
