import { getVersionTriple, renderMarkdown } from "@wechat-flow/core";
import themeDefaultPkg from "@wechat-flow/theme-default/package.json" with { type: "json" };
import { observeRenderMarkdownLatency } from "../metrics.ts";

export async function renderMarkdownTool(args: Record<string, unknown>) {
  const start = performance.now();
  const r = await renderMarkdown(String(args.markdown ?? ""), {
    themeId: args.themeId as string | undefined,
    customCss: args.customCss as string | undefined,
  });
  observeRenderMarkdownLatency(performance.now() - start);
  return {
    html: r.html,
    diagnostics: r.diagnostics,
    rulesetVersion: r.rulesetVersion,
    themeVersion: r.themeVersion,
    postPaste: r.postPaste,
    versionTriple: getVersionTriple(themeDefaultPkg.version),
  };
}
