import { describe, expect, it } from "vitest";
import { builtinRules } from "./builtin/index.ts";
import { readabilityRules } from "./readability/index.ts";
import type { RuleDefinition } from "./registry.ts";

describe("T-182 AC-001: RuleDefinition.stage is mandatory with no default", () => {
  it("rejects (at type-check time) a rule literal that omits `stage` — see pnpm exec turbo run typecheck --force", () => {
    // @ts-expect-error stage is a required field on RuleDefinition with no default; a rule
    // literal omitting it must fail type-check once RuleDefinition declares `stage`.
    const incomplete: RuleDefinition = {
      id: "t182-missing-stage-probe",
      scope: "strip",
      priority: 1,
      matcher: () => false,
      transform: (node) => node,
    };
    // Runtime guard so the probe isn't optimized away / flagged as an unused binding.
    expect(incomplete.id).toBe("t182-missing-stage-probe");
  });

  it("builtinRules contains exactly 45 entries (42 non-readability + 3 readability)", () => {
    expect(builtinRules).toHaveLength(45);
  });

  it("every builtinRules entry explicitly declares stage: 'authoring'", () => {
    const nonAuthoring = builtinRules.filter(
      (r) => (r as { stage?: string }).stage !== "authoring"
    );
    expect(nonAuthoring).toEqual([]);
  });

  it("readabilityRules (3 entries) explicitly declare stage: 'authoring'", () => {
    expect(readabilityRules).toHaveLength(3);
    const nonAuthoring = readabilityRules.filter(
      (r) => (r as { stage?: string }).stage !== "authoring"
    );
    expect(nonAuthoring).toEqual([]);
  });

  it("the distinct stage values observed across builtinRules is exactly the singleton set {'authoring'}", () => {
    const stages = new Set(builtinRules.map((r) => (r as { stage?: string }).stage));
    expect(stages).toEqual(new Set(["authoring"]));
  });
});
