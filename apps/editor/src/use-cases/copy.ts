import { simulatePaste } from "@wechat-flow/core";
import { buildDualMimePayload } from "./dual-mime-payload.ts";
import { composeRender } from "./render.ts";

export interface ComposeCopyInput {
  markdown: string;
  themeId?: string;
  notify?: (notification: { type: "success" | "error"; message: string }) => void;
}

export async function composeCopy(input: ComposeCopyInput): Promise<void> {
  const rendered = await composeRender({ markdown: input.markdown, themeId: input.themeId });
  const { filteredHtml } = simulatePaste(rendered.html);
  const plainText = rendered.html.replace(/<[^>]+>/g, "");
  const payload = buildDualMimePayload(filteredHtml, plainText);
  await navigator.clipboard.write(payload);
  input.notify?.({ type: "success", message: "已复制到剪贴板" });
}
