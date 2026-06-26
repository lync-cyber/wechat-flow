import { applyZhTypo } from "@wechat-flow/zh-typo";

export type DiffEntry = {
  original: string;
  revised: string;
  ruleId: string;
};

export type ZhTypoComposerResult = {
  fixed: string;
  perRule: Record<string, number>;
  totalChanges: number;
  diff: DiffEntry[];
};

export function composeApplyZhTypo(input: {
  markdown: string;
  rules?: string[];
}): ZhTypoComposerResult {
  const result = applyZhTypo(input);
  return {
    fixed: result.fixed,
    perRule: result.perRule,
    totalChanges: result.totalChanges,
    diff: result.changes,
  };
}
