import type { NodeChangeRecord } from "@wechat-flow/contracts";
import type { Element, Node, Parent, Root } from "hast";
import type { RuleDefinition } from "../registry.ts";

export interface TransformResult {
  hast: Root;
  nodeChangeRecords: NodeChangeRecord[];
}

function transformNode(node: Node, rules: RuleDefinition[], records: NodeChangeRecord[]): Node {
  const matchingRule = rules.find((r) => r.scope === "transform" && r.matcher(node));
  if (matchingRule) {
    const before = JSON.stringify(node);
    const transformed = matchingRule.transform(node);
    const result = transformed ?? node;
    records.push({
      nodeSelector: (node as Element).tagName ?? "unknown",
      before,
      after: JSON.stringify(result),
      attrDiff: [],
      triggerRuleId: matchingRule.id,
    });
    if ("children" in result) {
      const parent = result as Parent;
      return {
        ...parent,
        children: parent.children.map((child) => transformNode(child, rules, records)),
      } as unknown as Node;
    }
    return result;
  }
  if ("children" in node) {
    const parent = node as Parent;
    return {
      ...parent,
      children: parent.children.map((child) => transformNode(child, rules, records)),
    } as unknown as Node;
  }
  return node;
}

export function executeTransform(hast: Root, rules: RuleDefinition[]): TransformResult {
  const records: NodeChangeRecord[] = [];
  if (rules.length === 0) return { hast, nodeChangeRecords: records };
  const newHast = transformNode(hast, rules, records) as Root;
  return { hast: newHast, nodeChangeRecords: records };
}
