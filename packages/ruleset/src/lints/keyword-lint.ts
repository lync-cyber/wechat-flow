import type { Diagnostic } from "@wechat-flow/contracts";
import keywordList from "../keyword-list.json" with { type: "json" };

export const keywordListVersion: string = keywordList.version;

const DEFAULT_KEYWORDS: string[] = keywordList.keywords;

export interface KeywordLintOptions {
  keywords?: string[];
}

export function lintMarkdown(content: string, options?: KeywordLintOptions): Diagnostic[] {
  if (!content) return [];

  const keywords = options?.keywords ?? DEFAULT_KEYWORDS;
  const results: Diagnostic[] = [];
  const lines = content.split("\n");

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    for (const keyword of keywords) {
      let searchStart = 0;
      while (searchStart < line.length) {
        const col = line.indexOf(keyword, searchStart);
        if (col === -1) break;
        results.push({
          severity: "warning",
          ruleId: "keyword-lint",
          message: `违规关键词「${keyword}」`,
          matchedKeyword: keyword,
          location: { line: lineIndex + 1, column: col + 1 },
        });
        searchStart = col + keyword.length;
      }
    }
  }

  return results;
}
