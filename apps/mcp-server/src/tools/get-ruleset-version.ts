import { renderMarkdown } from "@wechat-flow/core";

export async function getRulesetVersionTool(args: Record<string, unknown>) {
  const r = await renderMarkdown("", {
    themeId: args.themeId as string | undefined,
  });
  return {
    coreVersion: r.coreVersion,
    themeVersion: r.themeVersion,
    rulesetVersion: r.rulesetVersion,
  };
}
