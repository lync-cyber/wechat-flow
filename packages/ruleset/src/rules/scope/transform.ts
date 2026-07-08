import type { NodeChangeRecord } from "@wechat-flow/contracts";
import type { Element, Node, Parent, Root } from "hast";
import type { RuleDefinition } from "../registry.ts";

export interface TransformResult {
  hast: Root;
  nodeChangeRecords: NodeChangeRecord[];
}

function transformNode(node: Node, rules: RuleDefinition[], records: NodeChangeRecord[]): Node {
  const transformRules = rules.filter((r) => r.scope === "transform");
  let current: Node = node;

  for (const rule of transformRules) {
    if (!rule.matcher(current)) continue;
    const before = JSON.stringify(current);
    const transformed = rule.transform(current);
    const result = transformed ?? current;
    records.push({
      nodeSelector: (current as Element).tagName ?? "unknown",
      before,
      after: JSON.stringify(result),
      attrDiff: [],
      triggerRuleId: rule.id,
    });
    current = result;
  }

  if ("children" in current) {
    const parent = current as Parent;
    return {
      ...parent,
      children: parent.children.map((child) => transformNode(child, rules, records)),
    } as unknown as Node;
  }
  return current;
}

export function executeTransform(hast: Root, rules: RuleDefinition[]): TransformResult {
  const records: NodeChangeRecord[] = [];
  if (rules.length === 0) return { hast, nodeChangeRecords: records };
  const newHast = transformNode(hast, rules, records) as Root;
  return { hast: newHast, nodeChangeRecords: records };
}
