import type { Root } from "hast";
import type { RuleDefinition } from "../registry.ts";

export function executeClamp(hast: Root, _rules: RuleDefinition[]): Root {
  return hast;
}
