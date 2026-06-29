import type { GuardFailure, ThemeDefinition } from "@wechat-flow/contracts";
import { listBlocks } from "../../registry/block.ts";

export function checkCoreBlockCoverage(theme: ThemeDefinition): GuardFailure | null {
  const registered = listBlocks();
  if (registered.length === 0) return null;

  const themeBlockKeys = Object.keys(theme.blocks ?? {});
  const hit = registered.filter((b) => themeBlockKeys.includes(b.id));
  const rate = hit.length / registered.length;

  if (rate >= 0.5) return null;

  const pct = (rate * 100).toFixed(1);
  return {
    dimension: "core-block-coverage",
    severity: "warning",
    message: `Block coverage ${pct}% (${hit.length}/${registered.length}) is below 50%`,
  };
}
