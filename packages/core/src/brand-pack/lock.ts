import type { Diagnostic, ThemeDefinition } from "@wechat-flow/contracts";

export function applyBrandPackLock(
  theme: ThemeDefinition,
  paint: Record<string, string>
): { allowed: Record<string, string>; warnDiagnostics: Diagnostic[] } {
  const lockedSet = new Set(theme.brandPack?.lockedTokens ?? []);
  const allowed: Record<string, string> = {};
  const warnDiagnostics: Diagnostic[] = [];

  for (const [tokenPath, overrideValue] of Object.entries(paint)) {
    if (lockedSet.has(tokenPath)) {
      warnDiagnostics.push({
        severity: "warning",
        ruleId: "brand-pack-locked-token",
        message: `token '${tokenPath}' is locked by brand pack and cannot be overridden`,
      });
    } else {
      allowed[tokenPath] = overrideValue;
    }
  }

  return { allowed, warnDiagnostics };
}
