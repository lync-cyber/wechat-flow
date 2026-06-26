import { composeApplyZhTypo } from "@wechat-flow/core";

export async function applyZhTypoTool(args: Record<string, unknown>) {
  const rules = Array.isArray(args.rules) ? (args.rules as string[]) : undefined;
  const result = composeApplyZhTypo({ markdown: String(args.markdown ?? ""), rules });
  return {
    fixed: result.fixed,
    perRule: result.perRule,
    totalChanges: result.totalChanges,
    diff: result.diff,
  };
}
