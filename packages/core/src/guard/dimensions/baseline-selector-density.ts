import type { GuardFailure, ThemeDefinition } from "@wechat-flow/contracts";

const REQUIRED_KEYS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "blockquote",
  "code",
  "hr",
] as const;

export function checkBaselineSelectorDensity(theme: ThemeDefinition): GuardFailure | null {
  const blocks = theme.blocks ?? {};
  const missing = REQUIRED_KEYS.filter((key) => !(key in blocks));

  if (missing.length === 0) return null;

  return {
    dimension: "baseline-selector-density",
    severity: "error",
    message: `Missing required block keys: ${missing.join(", ")}`,
  };
}
