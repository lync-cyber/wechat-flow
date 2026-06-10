import type { GuardFailure, GuardResult, ThemeDefinition } from "@wechat-flow/contracts";

type DimensionChecker = (theme: ThemeDefinition) => GuardFailure | null;

const checkWcagContrast: DimensionChecker = (theme) => {
  const declared = theme.meta?.wcagContrast;
  if (!declared || !declared.checked || declared.minRatio < 4.5) {
    return {
      dimension: "wcag-contrast",
      severity: "error",
      message: "Theme must declare wcagContrast with checked=true and minRatio >= 4.5 (WCAG AA)",
    };
  }
  return null;
};

const checkMetadataCompleteness: DimensionChecker = (theme) => {
  if (!theme.meta?.author) {
    return {
      dimension: "metadata-completeness",
      severity: "error",
      message: "Theme meta.author is required",
    };
  }
  return null;
};

// Remaining 6 dimension checkers — skeleton executors returning pass, full logic in Sprint 6 T-059
const passingDimensions: string[] = [
  "baseline-selector-density",
  "core-block-coverage",
  "token-coverage",
  "cross-theme-identity-token-collision",
  "theme-css-property-compliance",
  "decorative-asset-completeness",
];

const passingCheckers: DimensionChecker[] = passingDimensions.map(() => () => null);

const ALL_CHECKERS: DimensionChecker[] = [
  checkWcagContrast,
  checkMetadataCompleteness,
  ...passingCheckers,
];

export function validateThemeGuard(theme: ThemeDefinition): GuardResult {
  const failures: GuardFailure[] = [];
  for (const check of ALL_CHECKERS) {
    const failure = check(theme);
    if (failure !== null) {
      failures.push(failure);
    }
  }
  return { passed: failures.length === 0, failures };
}
