import { describeBlock, listBlockVariants } from "@wechat-flow/core";

// [ASSUMPTION] M-005 BlockVariant does not model a render function reference; render is always undefined.
// Backlog: extend BlockVariant with render metadata when M-005 is updated.

export function listBlockVariantsTool(args: Record<string, unknown>) {
  const blockId = String(args.blockId ?? "");
  const block = describeBlock(blockId);
  const builtinIds = new Set((block?.variants ?? []).map((v) => v.id));

  const builtins = (block?.variants ?? []).map((v) => ({
    id: v.id,
    blockId,
    label: v.label ?? v.id,
    render: undefined,
  }));

  const dynamic = listBlockVariants(blockId)
    .filter((v) => !builtinIds.has(v.id))
    .map((v) => ({
      id: v.id,
      blockId,
      label: v.label,
      render: undefined,
    }));

  return [...builtins, ...dynamic];
}
