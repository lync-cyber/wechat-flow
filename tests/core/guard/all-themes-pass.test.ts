import { describe, expect, it } from "vitest";
import { validateThemeGuard } from "../../../packages/core/src/guard/index.ts";
import businessTheme from "../../../packages/themes/business/src/index.ts";
import defaultTheme from "../../../packages/themes/default/src/index.ts";
import literaryTheme from "../../../packages/themes/literary/src/index.ts";
import magazineTheme from "../../../packages/themes/magazine/src/index.ts";
import techTheme from "../../../packages/themes/tech/src/index.ts";

// ---------------------------------------------------------------------------
// AC-011: all 5 built-in themes pass validateThemeGuard after magazine fix
//
// NOTE: This test is intentionally RED until:
//   1. packages/core/src/guard/index.ts (nine-dimensions) is implemented
//   2. packages/themes/magazine/src/tokens.ts --color-link is fixed to ≥ 4.5 contrast
//
// The magazine theme currently has --color-link: #D4521A vs --color-background: #FFFBF7
// yielding contrast ≈ 4.06 < 4.5 (WCAG AA fail). GREEN phase fixes this token.
// ---------------------------------------------------------------------------

const ALL_THEMES = [
  { name: "default", theme: defaultTheme },
  { name: "magazine", theme: magazineTheme },
  { name: "literary", theme: literaryTheme },
  { name: "business", theme: businessTheme },
  { name: "tech", theme: techTheme },
];

describe("AC-011: all 5 built-in themes pass validateThemeGuard (result.passed === true)", () => {
  for (const { name, theme } of ALL_THEMES) {
    it(`${name}: result.passed === true`, () => {
      const result = validateThemeGuard(theme);
      // Collect error-level failures for diagnosis
      const errors = result.failures.filter((f) => f.severity === "error");
      // Assert passed is true; if this fails, errors will be printed via vitest diagnostics
      expect(
        result.passed,
        `${name} theme failed with error-level failures:\n${errors.map((e) => `  [${e.dimension}] ${e.message ?? ""}`).join("\n")}`
      ).toBe(true);
    });
  }
});

describe("AC-011: all 5 built-in themes have no error-level failures", () => {
  for (const { name, theme } of ALL_THEMES) {
    it(`${name}: no error-level failures`, () => {
      const result = validateThemeGuard(theme);
      const errors = result.failures.filter((f) => f.severity === "error");
      expect(
        errors,
        `${name} theme has ${errors.length} error-level failure(s):\n${errors.map((e) => `  [${e.dimension}] ${e.message ?? ""}`).join("\n")}`
      ).toHaveLength(0);
    });
  }
});
