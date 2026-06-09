import type { Node } from "hast";
import { rulesetVersion } from "../version/manifest.ts";

export type RuleScope = "strip" | "clamp" | "transform" | "patch" | "lint";

export interface RuleDefinition {
  id: string;
  scope: RuleScope;
  priority: number;
  matcher: (node: Node) => boolean;
  transform: (node: Node) => Node;
  fixture?: string;
}

const _rules: RuleDefinition[] = [];

export function registerRule(rule: RuleDefinition): void {
  _rules.push(rule);
}

export function getRules(): readonly RuleDefinition[] {
  return _rules;
}

export function getRulesetVersion(): string {
  return rulesetVersion;
}
