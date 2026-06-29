import { describe, expect, it } from "vitest";
import {
  builtinRules,
  getRulesetVersion,
  rulesetVersion,
} from "../../packages/ruleset/src/index.ts";

// ── AC-001: total builtin rule count ─────────────────────────────────────────

describe("T-056 AC-001: builtinRules total count >= 42", () => {
  it("builtinRules array contains at least 42 RuleDefinition entries", () => {
    expect(builtinRules.length).toBeGreaterThanOrEqual(42);
  });
});

// ── AC-004: getRulesetVersion returns valid semver consistent with package.json ─

describe("T-056 AC-004: getRulesetVersion returns valid semver matching rulesetVersion constant", () => {
  it("returns a string matching semver pattern /^\\d+\\.\\d+\\.\\d+/", () => {
    const version = getRulesetVersion();

    expect(typeof version).toBe("string");
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("getRulesetVersion() === rulesetVersion (imported constant from manifest)", () => {
    expect(getRulesetVersion()).toBe(rulesetVersion);
  });
});
