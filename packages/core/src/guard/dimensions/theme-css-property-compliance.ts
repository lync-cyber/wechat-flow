import type { GuardFailure, ThemeDefinition } from "@wechat-flow/contracts";

// category segment: letter-led ([a-z][a-z0-9]*)
// role/modifier segments: allow digit-led scale names (2xl/3xl/h1) per CSS custom property convention
const TOKEN_KEY_REGEX = /^--[a-z][a-z0-9]*(-[a-z0-9]+)+$/;

export function checkThemeCssPropertyCompliance(theme: ThemeDefinition): GuardFailure | null {
  const tokens = theme.tokens ?? {};
  const violating = Object.keys(tokens).filter((key) => !TOKEN_KEY_REGEX.test(key));

  if (violating.length === 0) return null;

  return {
    dimension: "theme-css-property-compliance",
    severity: "error",
    message: `Invalid token key format: ${violating.join(", ")}`,
  };
}
