import { describeBlock, listBlockVariants } from "@wechat-flow/core";

export function listBlockVariantsTool(args: Record<string, unknown>) {
  const blockId = String(args.blockId ?? "");
  const block = describeBlock(blockId);
  const builtinIds = new Set((block?.variants ?? []).map((v) => v.id));

  const builtins = (block?.variants ?? []).map((v) => ({
    id: v.id,
    blockId,
    label: v.label ?? v.id,
  }));

  const dynamic = listBlockVariants(blockId)
    .filter((v) => !builtinIds.has(v.id))
    .map((v) => ({
      id: v.id,
      blockId,
      label: v.label,
    }));

  return [...builtins, ...dynamic];
}
