import type { Text } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toMarkdown } from "mdast-util-to-markdown";
import { visit } from "unist-util-visit";
import { applyEllipsisDash } from "./rules/ellipsis-dash.ts";
import { applyFullwidthPunctuation } from "./rules/fullwidth-punctuation.ts";
import { applySmartQuotes } from "./rules/smart-quotes.ts";
import { applyZhEnSpace } from "./rules/zh-en-space.ts";

export type ZhTypoChange = {
  original: string;
  revised: string;
  ruleId: string;
};

export type ZhTypoResult = {
  fixed: string;
  perRule: Record<string, number>;
  totalChanges: number;
  changes: ZhTypoChange[];
};

type RuleEntry = {
  id: string;
  fn: (v: string) => { value: string; count: number };
};

const RULES: RuleEntry[] = [
  { id: "ellipsis-dash", fn: applyEllipsisDash },
  { id: "smart-quotes", fn: applySmartQuotes },
  { id: "fullwidth-punctuation", fn: applyFullwidthPunctuation },
  { id: "zh-en-space", fn: applyZhEnSpace },
];

export function applyZhTypo(input: { markdown: string; rules?: string[] }): ZhTypoResult {
  const activeRules = input.rules ? RULES.filter((r) => input.rules?.includes(r.id)) : RULES;
  const tree = fromMarkdown(input.markdown);
  const perRule: Record<string, number> = {};
  const changes: ZhTypoChange[] = [];

  for (const rule of activeRules) {
    perRule[rule.id] = 0;
  }

  visit(tree, "text", (node: Text) => {
    let value = node.value;
    for (const rule of activeRules) {
      const before = value;
      const result = rule.fn(value);
      perRule[rule.id] += result.count;
      value = result.value;
      if (result.count > 0) {
        changes.push({ original: before, revised: value, ruleId: rule.id });
      }
    }
    node.value = value;
  });

  const fixed = toMarkdown(tree, {
    // Preserve existing emphasis/strong markers and avoid unnecessary escaping
    bullet: "-",
    emphasis: "*",
    strong: "*",
    fence: "`",
    fences: true,
  });

  // remark-stringify appends a trailing newline; strip it to match input expectations
  const fixedTrimmed = fixed.endsWith("\n") ? fixed.slice(0, -1) : fixed;

  const totalChanges = Object.values(perRule).reduce((s, c) => s + c, 0);

  return { fixed: fixedTrimmed, perRule, totalChanges, changes };
}
