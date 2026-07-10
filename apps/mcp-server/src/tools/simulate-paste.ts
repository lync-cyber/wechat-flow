import { wechatAdapter } from "@wechat-flow/core";
import { observeFallbackPlatformPatchHits } from "../metrics.ts";

export function simulatePasteTool(args: Record<string, unknown>) {
  const html = typeof args.html === "string" ? args.html : "";
  const { patchedHtml, changes } = wechatAdapter.inspect(html);
  observeFallbackPlatformPatchHits(changes.length);
  return { patchedHtml, changes, filteredHtml: patchedHtml };
}
