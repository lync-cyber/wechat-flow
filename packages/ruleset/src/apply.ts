import type { Diagnostic, NodeChangeRecord } from "@wechat-flow/contracts";
import type { Root } from "hast";
import type { RuleDefinition } from "./rules/registry.ts";
import { executeClamp } from "./rules/scope/clamp.ts";
import { executeLint } from "./rules/scope/lint.ts";
import { executePatch } from "./rules/scope/patch.ts";
import { executeStrip } from "./rules/scope/strip.ts";
import { executeTransform } from "./rules/scope/transform.ts";

export interface ApplyRulesetResult {
  hast: Root;
  diagnostics: Diagnostic[];
  nodeChangeRecords: NodeChangeRecord[];
}

export function applyRuleset(hast: Root, ruleset: RuleDefinition[]): ApplyRulesetResult {
  if (ruleset.length === 0) {
    return {
      hast,
      diagnostics: [],
      nodeChangeRecords: [],
    };
  }

  const stripRules = ruleset.filter((r) => r.scope === "strip");
  const clampRules = ruleset.filter((r) => r.scope === "clamp");
  const transformRules = ruleset.filter((r) => r.scope === "transform");
  const patchRules = ruleset.filter((r) => r.scope === "patch");
  const lintRules = ruleset.filter((r) => r.scope === "lint");

  const stripResult = executeStrip(hast, stripRules);
  const afterClamp = executeClamp(stripResult.hast, clampRules);
  const transformResult = executeTransform(afterClamp, transformRules);
  const afterPatch = executePatch(transformResult.hast, patchRules);
  const lintResult = executeLint(afterPatch, lintRules);

  return {
    hast: lintResult.hast,
    diagnostics: lintResult.diagnostics,
    nodeChangeRecords: [...stripResult.nodeChangeRecords, ...transformResult.nodeChangeRecords],
  };
}
