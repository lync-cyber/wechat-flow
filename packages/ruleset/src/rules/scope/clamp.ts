import type { Node, Parent, Root } from "hast";
import type { RuleDefinition } from "../registry.ts";

function clampNode(node: Node, rules: RuleDefinition[]): Node {
  const clampRules = rules.filter((r) => r.scope === "clamp");
  let current: Node = node;

  for (const rule of clampRules) {
    if (!rule.matcher(current)) continue;
    const transformed = rule.transform(current);
    current = transformed ?? current;
  }

  if ("children" in current) {
    const parent = current as Parent;
    return {
      ...parent,
      children: parent.children.map((child) => clampNode(child, rules)),
    } as unknown as Node;
  }
  return current;
}

export function executeClamp(hast: Root, rules: RuleDefinition[]): Root {
  if (rules.length === 0) return hast;
  return clampNode(hast, rules) as Root;
}
