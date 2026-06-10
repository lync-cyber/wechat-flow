import type { Node, Parent, Root } from "hast";
import type { RuleDefinition } from "../registry.ts";

function patchNode(node: Node, rules: RuleDefinition[]): Node {
  const patchRules = rules.filter((r) => r.scope === "patch");
  let current: Node = node;

  for (const rule of patchRules) {
    if (!rule.matcher(current)) continue;
    const transformed = rule.transform(current);
    current = transformed ?? current;
  }

  if ("children" in current) {
    const parent = current as Parent;
    return {
      ...parent,
      children: parent.children.map((child) => patchNode(child, rules)),
    } as unknown as Node;
  }
  return current;
}

export function executePatch(hast: Root, rules: RuleDefinition[]): Root {
  if (rules.length === 0) return hast;
  return patchNode(hast, rules) as Root;
}
