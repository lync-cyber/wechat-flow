import type { Diagnostic } from "@wechat-flow/contracts";
import type { Node } from "hast";
import { rulesetVersion } from "../version/manifest.ts";

export type RuleScope = "strip" | "clamp" | "transform" | "patch" | "lint";

export interface RuleDefinition {
  id: string;
  scope: RuleScope;
  priority: number;
  matcher: (node: Node) => boolean;
  /** Return null to delete the matched node entirely. For lint rules, return the node unchanged. */
  transform: (node: Node) => Node | null;
  /** For lint-scope rules: produce diagnostics for matched nodes. */
  diagnose?: (node: Node) => Diagnostic[];
  fixture?: string;
}

const _rules: RuleDefinition[] = [];

export function registerRule(rule: RuleDefinition): void {
  _rules.push(rule);
}

export function upsertRule(rule: RuleDefinition): void {
  const idx = _rules.findIndex((r) => r.id === rule.id);
  if (idx >= 0) {
    _rules[idx] = rule;
  } else {
    _rules.push(rule);
  }
}

export function getRules(): readonly RuleDefinition[] {
  return _rules;
}

export function getRulesetVersion(): string {
  return rulesetVersion;
}
