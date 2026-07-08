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

  it("builtinRules declares exactly 8 authoring-stage entries and 37 output-stage entries (arch 附录 A)", () => {
    const authoring = builtinRules.filter((r) => (r as { stage?: string }).stage === "authoring");
    const output = builtinRules.filter((r) => (r as { stage?: string }).stage === "output");
    expect(authoring).toHaveLength(8);
    expect(output).toHaveLength(37);
  });

  it("readabilityRules (3 entries) explicitly declare stage: 'output' (arch 附录 A.2 lint 域)", () => {
    expect(readabilityRules).toHaveLength(3);
    const nonOutput = readabilityRules.filter((r) => (r as { stage?: string }).stage !== "output");
    expect(nonOutput).toEqual([]);
  });

  it("the distinct stage values observed across builtinRules is exactly {'authoring', 'output'}", () => {
    const stages = new Set(builtinRules.map((r) => (r as { stage?: string }).stage));
    expect(stages).toEqual(new Set(["authoring", "output"]));
  });
});
