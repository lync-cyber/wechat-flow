import { listTokens } from "@wechat-flow/core";

export function listTokensTool(_args: Record<string, unknown>) {
  return { tokens: listTokens() };
}
