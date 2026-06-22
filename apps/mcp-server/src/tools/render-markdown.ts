import { renderMarkdown } from "@wechat-flow/core";

export async function renderMarkdownTool(args: Record<string, unknown>) {
  const r = await renderMarkdown(String(args.markdown ?? ""), {
    themeId: args.themeId as string | undefined,
    customCss: args.customCss as string | undefined,
  });
  return {
    html: r.html,
    diagnostics: r.diagnostics,
    rulesetVersion: r.rulesetVersion,
    themeVersion: r.themeVersion,
    postPaste: r.postPaste,
  };
}
