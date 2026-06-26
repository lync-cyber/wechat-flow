import { describeBlock, describeVariant } from "@wechat-flow/core";
import { z } from "zod";

export function describeVariantTool(args: Record<string, unknown>) {
  const blockId = String(args.blockId ?? "");
  const variantId = String(args.variantId ?? "");
  const block = describeBlock(blockId);
  if (!block) return { code: "E_NOT_FOUND", blockId };

  const attrsSchema = z.toJSONSchema(block.attrsSchema);

  const builtin = block.variants.find((v) => v.id === variantId);
  if (builtin) {
    return {
      id: variantId,
      blockId,
      label: builtin.label ?? variantId,
      attrsSchema,
      style: block.baseStyle ?? {},
    };
  }

  const dynamic = describeVariant(variantId);
  if (dynamic && dynamic.blockId === blockId) {
    return {
      id: dynamic.id,
      blockId: dynamic.blockId,
      label: dynamic.label,
      attrsSchema,
      style: dynamic.style,
    };
  }

  return { code: "E_NOT_FOUND", blockId, variantId };
}
