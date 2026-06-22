import { listBlocks } from "@wechat-flow/core";

export function listBlocksTool(_args: Record<string, unknown>) {
  return listBlocks().map((b) => ({
    id: b.id,
    name: b.name,
    variants: b.variants,
  }));
}
