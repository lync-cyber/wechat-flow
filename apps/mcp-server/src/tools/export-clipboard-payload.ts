import { renderMarkdown, simulatePaste } from "@wechat-flow/core";

export async function exportClipboardPayloadTool(args: Record<string, unknown>) {
  const markdown = String(args.markdown ?? "");
  const themeId = args.themeId as string | undefined;
  const rendered = await renderMarkdown(markdown, themeId ? { themeId } : undefined);
  const { filteredHtml } = simulatePaste(rendered.html);
  const text = rendered.html.replace(/<[^>]+>/g, "");
  return { html: filteredHtml, text };
}
