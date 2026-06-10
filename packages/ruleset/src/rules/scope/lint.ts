import type { Diagnostic } from "@wechat-flow/contracts";
import type { Node, Parent, Root } from "hast";
import type { RuleDefinition } from "../registry.ts";

export interface LintResult {
  hast: Root;
  diagnostics: Diagnostic[];
}

function lintNode(node: Node, rules: RuleDefinition[], diagnostics: Diagnostic[]): Node {
  for (const rule of rules) {
    if (rule.scope === "lint" && rule.matcher(node) && rule.diagnose) {
      diagnostics.push(...rule.diagnose(node));
    }
  }
  if ("children" in node) {
    const parent = node as Parent;
    return {
      ...parent,
      children: parent.children.map((child) => lintNode(child, rules, diagnostics)),
    } as unknown as Node;
  }
  return node;
}

export function executeLint(hast: Root, rules: RuleDefinition[]): LintResult {
  const diagnostics: Diagnostic[] = [];
  if (rules.length === 0) return { hast, diagnostics };
  const newHast = lintNode(hast, rules, diagnostics) as Root;
  return { hast: newHast, diagnostics };
}
