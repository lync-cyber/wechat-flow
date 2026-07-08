import type { Element, Node, Root } from "hast";
import { describe, expect, it } from "vitest";
import { applyRuleset } from "./apply.ts";
import type { RuleDefinition } from "./rules/registry.ts";

type Stage = "authoring" | "output";

// Cast bridges the current 2-arg applyRuleset(hast, rules) to the target
// applyRuleset(hast, rules, stage) signature so these RED tests already exercise
// the intended call shape without a premature arity-mismatch compile error.
type StagedApplyRuleset = (
  hast: Root,
  rules: RuleDefinition[],
  stage: Stage
) => { hast: Root; diagnostics: unknown[]; nodeChangeRecords: unknown[] };
const applyRulesetStaged = applyRuleset as unknown as StagedApplyRuleset;

// Two distinct target nodes (p / span) are used — not one shared node — because
// executeTransform's per-node dispatch is "first matching same-scope rule wins";
// sharing one node would make the outcome depend on array order rather than on
// stage filtering, producing a false-positive pass. Distinct targets isolate the
// two rules so each assertion can only be satisfied by real stage-based filtering.
function makeHast(): Root {
  const p: Element = { type: "element", tagName: "p", properties: {}, children: [] };
  const span: Element = { type: "element", tagName: "span", properties: {}, children: [] };
  return { type: "root", children: [p, span] };
}

function findByTag(root: Root, tagName: string): Element {
  const el = root.children.find((c) => c.type === "element" && (c as Element).tagName === tagName);
  if (!el) throw new Error(`no <${tagName}> found in result hast`);
  return el as Element;
}

function makeMarkerRule(stage: Stage, targetTag: string, markerAttr: string) {
  return {
    id: `t182-probe-${stage}`,
    scope: "transform" as const,
    priority: 10,
    matcher: (node: Node) => node.type === "element" && (node as Element).tagName === targetTag,
    transform: (node: Node) => {
      const el = node as Element;
      return { ...el, properties: { ...el.properties, [markerAttr]: "1" } };
    },
    stage,
  };
}

describe("T-182 AC-002: applyRuleset(hast, rules, stage) filters rules by stage before execution", () => {
  it('stage="authoring" applies the authoring-stage rule (on <p>); the output-stage rule (on <span>) does not run', () => {
    const authoringRule = makeMarkerRule("authoring", "p", "data-authoring-applied");
    const outputRule = makeMarkerRule("output", "span", "data-output-applied");

    const result = applyRulesetStaged(makeHast(), [authoringRule, outputRule], "authoring");

    expect(findByTag(result.hast, "p").properties).toHaveProperty("data-authoring-applied", "1");
    expect(findByTag(result.hast, "span").properties).not.toHaveProperty("data-output-applied");
  });

  it('stage="output" applies the output-stage rule (on <span>); the authoring-stage rule (on <p>) does not run', () => {
    const authoringRule = makeMarkerRule("authoring", "p", "data-authoring-applied");
    const outputRule = makeMarkerRule("output", "span", "data-output-applied");

    const result = applyRulesetStaged(makeHast(), [authoringRule, outputRule], "output");

    expect(findByTag(result.hast, "span").properties).toHaveProperty("data-output-applied", "1");
    expect(findByTag(result.hast, "p").properties).not.toHaveProperty("data-authoring-applied");
  });
});
