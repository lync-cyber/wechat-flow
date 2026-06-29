import type { GuardFailure, ThemeDefinition } from "@wechat-flow/contracts";

export function checkMetadataCompleteness(theme: ThemeDefinition): GuardFailure | null {
  const meta = theme.meta;
  const missingParts: string[] = [];

  if (!meta?.author) {
    missingParts.push("meta.author is missing or empty");
  }
  if (!meta?.wcagContrast || meta.wcagContrast.checked !== true) {
    missingParts.push("meta.wcagContrast.checked must be true");
  }

  if (missingParts.length === 0) return null;

  return {
    dimension: "metadata-completeness",
    severity: "error",
    message: missingParts.join("; "),
  };
}
