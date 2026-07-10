// [ASSUMPTION] MCP path calls M-002 renderMarkdown directly; M-008 composeRender adds
// editor-facing fields (versionTriple/nodeLocations) not needed here.
import { renderMarkdown } from "@wechat-flow/core";

export async function exportClipboardPayloadTool(args: Record<string, unknown>) {
  const markdown = String(args.markdown ?? "");
  const themeId = args.themeId as string | undefined;
  const rendered = await renderMarkdown(markdown, themeId ? { themeId } : undefined);
  const text = rendered.html.replace(/<[^>]+>/g, "");
  return { html: rendered.html, text };
}
