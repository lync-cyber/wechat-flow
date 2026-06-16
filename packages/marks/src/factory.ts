import type { MarkDefinition } from "@wechat-flow/core";

export function defineMark(id: string, name: string, style: string): MarkDefinition {
  return { id, name, style };
}
