import type { NodeChangeRecord } from "@wechat-flow/contracts";
import type { Element, Node, Parent, Root } from "hast";
import type { RuleDefinition } from "../registry.ts";

export interface StripResult {
  hast: Root;
  nodeChangeRecords: NodeChangeRecord[];
}

function stripNode(node: Node, rules: RuleDefinition[], records: NodeChangeRecord[]): Node | null {
  const stripRules = rules.filter((r) => r.scope === "strip");
  let current: Node = node;

  for (const rule of stripRules) {
    if (!rule.matcher(current)) continue;
    const before = JSON.stringify(current);
    const transformed = rule.transform(current);
    if (transformed === null) {
      records.push({
        nodeSelector: (current as Element).tagName ?? "unknown",
        before,
        after: "null",
        attrDiff: [],
        triggerRuleId: rule.id,
      });
      return null;
    }
    records.push({
      nodeSelector: (transformed as Element).tagName ?? "unknown",
      before,
      after: JSON.stringify(transformed),
      attrDiff: [],
      triggerRuleId: rule.id,
    });
    current = transformed;
  }

  if ("children" in current) {
    const parent = current as Parent;
    const newChildren: Node[] = [];
    for (const child of parent.children) {
      const result = stripNode(child, rules, records);
      if (result !== null) newChildren.push(result);
    }
    return { ...parent, children: newChildren } as unknown as Node;
  }

  return current;
}

export function executeStrip(hast: Root, rules: RuleDefinition[]): StripResult {
  const records: NodeChangeRecord[] = [];
  const result = stripNode(hast, rules, records);
  return { hast: (result ?? hast) as Root, nodeChangeRecords: records };
}
