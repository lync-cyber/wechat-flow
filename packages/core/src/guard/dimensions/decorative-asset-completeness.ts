import type { GuardFailure, ThemeDefinition } from "@wechat-flow/contracts";

export function checkDecorativeAssetCompleteness(theme: ThemeDefinition): GuardFailure | null {
  const assets = theme.assets;
  if (!assets || Object.keys(assets).length === 0) return null;

  const emptyKeys = Object.entries(assets)
    .filter(([, value]) => value === "" || value === null || value === undefined)
    .map(([key]) => key);

  if (emptyKeys.length === 0) return null;

  return {
    dimension: "decorative-asset-completeness",
    severity: "error",
    message: `Declared assets with empty values: ${emptyKeys.join(", ")}`,
  };
}
