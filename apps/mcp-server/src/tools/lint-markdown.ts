import { renderMarkdown } from "@wechat-flow/core";

export async function lintMarkdownTool(args: Record<string, unknown>) {
  const r = await renderMarkdown(String(args.markdown ?? ""), {
    themeId: args.themeId as string | undefined,
    customCss: args.customCss as string | undefined,
  });
  return { diagnostics: r.diagnostics };
}
