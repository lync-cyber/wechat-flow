import type { RuleDefinition } from "../registry.ts";
import readabilityFontSizeMin from "./readability-font-size-min.ts";
import readabilityLineHeightMin from "./readability-line-height-min.ts";
import readabilityParagraphLength from "./readability-paragraph-length.ts";

export const readabilityRules: RuleDefinition[] = [
  readabilityFontSizeMin,
  readabilityLineHeightMin,
  readabilityParagraphLength,
];
