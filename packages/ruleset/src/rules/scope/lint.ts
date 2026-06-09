import type { Root } from "hast";
import type { RuleDefinition } from "../registry.ts";

export function executeLint(hast: Root, _rules: RuleDefinition[]): Root {
  return hast;
}
