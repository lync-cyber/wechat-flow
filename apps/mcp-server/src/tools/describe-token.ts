import { describeToken } from "@wechat-flow/core";

export function describeTokenTool(args: Record<string, unknown>) {
  const id = String(args.id ?? "");
  const token = describeToken(id);
  if (token) return token;
  return { code: "E_NOT_FOUND", id };
}
