import { describeBlock } from "@wechat-flow/core";
import { z } from "zod";

export function describeBlockTool(args: Record<string, unknown>) {
  const blockId = String(args.blockId ?? "");
  const block = describeBlock(blockId);
  if (!block) return { code: "E_NOT_FOUND", blockId };
  return {
    id: block.id,
    name: block.name,
    attrsSchema: z.toJSONSchema(block.attrsSchema),
    variants: block.variants,
    baseStyle: block.baseStyle,
  };
}
