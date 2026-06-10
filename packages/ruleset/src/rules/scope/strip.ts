import type { NodeChangeRecord } from "@wechat-flow/contracts";
import type { Element, Node, Parent, Root } from "hast";
import type { RuleDefinition } from "../registry.ts";

export interface StripResult {
  hast: Root;
  nodeChangeRecords: NodeChangeRecord[];
}

function stripNode(node: Node, rules: RuleDefinition[], records: NodeChangeRecord[]): Node | null {
  const matchingRule = rules.find((r) => r.scope === "strip" && r.matcher(node));

  if (matchingRule) {
    const before = JSON.stringify(node);
    const transformed = matchingRule.transform(node);
    if (transformed === null) {
      records.push({
        nodeSelector: (node as Element).tagName ?? "unknown",
        before,
        after: "null",
        attrDiff: [],
        triggerRuleId: matchingRule.id,
      });
      return null;
    }
    const after = JSON.stringify(transformed);
    records.push({
      nodeSelector: (transformed as Element).tagName ?? "unknown",
      before,
      after,
      attrDiff: [],
      triggerRuleId: matchingRule.id,
    });
    if ("children" in transformed) {
      const parent = transformed as Parent;
      const newChildren: Node[] = [];
      for (const child of parent.children) {
        const result = stripNode(child, rules, records);
        if (result !== null) newChildren.push(result);
      }
      return { ...parent, children: newChildren } as unknown as Node;
    }
    return transformed;
  }

  if ("children" in node) {
    const parent = node as Parent;
    const newChildren: Node[] = [];
    for (const child of parent.children) {
      const result = stripNode(child, rules, records);
      if (result !== null) newChildren.push(result);
    }
    return { ...parent, children: newChildren } as unknown as Node;
  }

  return node;
}

export function executeStrip(hast: Root, rules: RuleDefinition[]): StripResult {
  const records: NodeChangeRecord[] = [];
  const result = stripNode(hast, rules, records);
  return { hast: (result ?? hast) as Root, nodeChangeRecords: records };
}
