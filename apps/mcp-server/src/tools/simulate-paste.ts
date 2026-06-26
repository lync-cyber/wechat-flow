import { simulatePaste } from "@wechat-flow/core";

export function simulatePasteTool(args: Record<string, unknown>) {
  const html = typeof args.html === "string" ? args.html : "";
  const { filteredHtml, nodeDiffs, droppedAttrs } = simulatePaste(html);
  return { filteredHtml, diffNodes: nodeDiffs, droppedAttrs };
}
