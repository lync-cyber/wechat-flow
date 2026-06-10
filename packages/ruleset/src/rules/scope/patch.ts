import type { Node, Parent, Root } from "hast";
import type { RuleDefinition } from "../registry.ts";

function patchNode(node: Node, rules: RuleDefinition[]): Node {
  const matchingRule = rules.find((r) => r.scope === "patch" && r.matcher(node));
  if (matchingRule) {
    const transformed = matchingRule.transform(node);
    const result = transformed ?? node;
    if ("children" in result) {
      const parent = result as Parent;
      return {
        ...parent,
        children: parent.children.map((child) => patchNode(child, rules)),
      } as unknown as Node;
    }
    return result;
  }
  if ("children" in node) {
    const parent = node as Parent;
    return {
      ...parent,
      children: parent.children.map((child) => patchNode(child, rules)),
    } as unknown as Node;
  }
  return node;
}

export function executePatch(hast: Root, rules: RuleDefinition[]): Root {
  if (rules.length === 0) return hast;
  return patchNode(hast, rules) as Root;
}
