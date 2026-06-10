import type { Element, Node, Parent, Root } from "hast";
import type { RuleDefinition } from "../registry.ts";

function clampNode(node: Node, rules: RuleDefinition[]): Node {
  const matchingRule = rules.find((r) => r.scope === "clamp" && r.matcher(node));
  if (matchingRule) {
    const transformed = matchingRule.transform(node);
    const result = transformed ?? node;
    if ("children" in result) {
      const parent = result as Parent;
      return {
        ...parent,
        children: parent.children.map((child) => clampNode(child, rules)),
      } as unknown as Node;
    }
    return result;
  }
  if ("children" in node) {
    const parent = node as Parent;
    return {
      ...parent,
      children: parent.children.map((child) => clampNode(child, rules)),
    } as unknown as Node;
  }
  return node;
}

export function executeClamp(hast: Root, rules: RuleDefinition[]): Root {
  if (rules.length === 0) return hast;
  return clampNode(hast, rules) as Root;
}
