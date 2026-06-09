import type { NodeChangeRecord } from "@wechat-flow/contracts";
import type { Element, Node, Parent, Root } from "hast";
import type { RuleDefinition } from "../registry.ts";

export interface StripResult {
  hast: Root;
  nodeChangeRecords: NodeChangeRecord[];
}

function stripNode(node: Node, rules: RuleDefinition[], records: NodeChangeRecord[]): Node {
  const matchingRule = rules.find((r) => r.scope === "strip" && r.matcher(node));

  let current: Node = node;
  if (matchingRule) {
    const before = JSON.stringify(current);
    current = matchingRule.transform(current);
    const after = JSON.stringify(current);
    records.push({
      nodeSelector: (current as Element).tagName ?? "unknown",
      before,
      after,
      attrDiff: [],
      triggerRuleId: matchingRule.id,
    });
  }

  if ("children" in current) {
    const parent = current as Parent;
    const newChildren = parent.children.map((child) => stripNode(child, rules, records));
    return { ...parent, children: newChildren } as unknown as Node;
  }

  return current;
}

export function executeStrip(hast: Root, rules: RuleDefinition[]): StripResult {
  const records: NodeChangeRecord[] = [];
  const resultHast = stripNode(hast, rules, records) as Root;
  return { hast: resultHast, nodeChangeRecords: records };
}
