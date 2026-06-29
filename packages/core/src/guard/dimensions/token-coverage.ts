import type { GuardFailure, ThemeDefinition } from "@wechat-flow/contracts";

const REQUIRED_PREFIXES: Record<string, string> = {
  "--color-": "color",
  "--spacing-": "spacing",
  "--font-": "font",
  "--decoration-": "decoration",
  "--align-": "alignment",
};

const MIN_TOKEN_COUNT = 60;

export function checkTokenCoverage(theme: ThemeDefinition): GuardFailure | null {
  const tokens = theme.tokens ?? {};
  const keys = Object.keys(tokens);
  const count = keys.length;

  const missingCategories: string[] = [];
  for (const [prefix, label] of Object.entries(REQUIRED_PREFIXES)) {
    if (!keys.some((k) => k.startsWith(prefix))) {
      missingCategories.push(label);
    }
  }

  if (count >= MIN_TOKEN_COUNT && missingCategories.length === 0) return null;

  const parts: string[] = [];
  if (count < MIN_TOKEN_COUNT) {
    parts.push(`total tokens: ${count} (required ≥${MIN_TOKEN_COUNT})`);
  }
  if (missingCategories.length > 0) {
    parts.push(`missing categories: ${missingCategories.join(", ")}`);
  }

  return {
    dimension: "token-coverage",
    severity: "error",
    message: parts.join("; "),
  };
}
