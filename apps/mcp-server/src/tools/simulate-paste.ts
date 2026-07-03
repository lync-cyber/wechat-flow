import { simulatePaste } from "@wechat-flow/core";
import { observePasteSimulationDiffRatio } from "../metrics.ts";

export function simulatePasteTool(args: Record<string, unknown>) {
  const html = typeof args.html === "string" ? args.html : "";
  const { filteredHtml, nodeDiffs, droppedAttrs, sourceNodeCount } = simulatePaste(html);
  // nodeDiffs is capped at 100 (see diffNodes limit) while sourceNodeCount is not,
  // so this ratio is a lower bound on the true diff ratio for large trees.
  observePasteSimulationDiffRatio(Math.min(1, nodeDiffs.length / Math.max(1, sourceNodeCount)));
  return { filteredHtml, diffNodes: nodeDiffs, droppedAttrs };
}
