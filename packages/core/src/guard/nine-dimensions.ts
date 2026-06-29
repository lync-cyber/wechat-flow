import type { GuardFailure, GuardResult, ThemeDefinition } from "@wechat-flow/contracts";
import { checkBaselineSelectorDensity } from "./dimensions/baseline-selector-density.ts";
import { checkCoreBlockCoverage } from "./dimensions/core-block-coverage.ts";
import { checkCrossThemeIdentityTokenCollision } from "./dimensions/cross-theme-identity-token-collision.ts";
import { checkDecorativeAssetCompleteness } from "./dimensions/decorative-asset-completeness.ts";
import { checkMetadataCompleteness } from "./dimensions/metadata-completeness.ts";
import { checkTemplateCompleteness } from "./dimensions/template-completeness.ts";
import { checkThemeCssPropertyCompliance } from "./dimensions/theme-css-property-compliance.ts";
import { checkTokenCoverage } from "./dimensions/token-coverage.ts";
import { checkWcagContrast } from "./dimensions/wcag-contrast.ts";

type DimensionChecker = (theme: ThemeDefinition) => GuardFailure | null;

const ALL_CHECKERS: DimensionChecker[] = [
  checkBaselineSelectorDensity,
  checkCoreBlockCoverage,
  checkTokenCoverage,
  checkCrossThemeIdentityTokenCollision,
  checkMetadataCompleteness,
  checkThemeCssPropertyCompliance,
  checkWcagContrast,
  checkDecorativeAssetCompleteness,
  checkTemplateCompleteness,
];

export function validateThemeGuard(theme: ThemeDefinition): GuardResult {
  const failures: GuardFailure[] = [];
  for (const check of ALL_CHECKERS) {
    const failure = check(theme);
    if (failure !== null) {
      failures.push(failure);
    }
  }
  const passed = failures.filter((f) => f.severity === "error").length === 0;
  return { passed, failures };
}
