import type { Diagnostic } from "@wechat-flow/contracts";
import { lintMarkdown } from "@wechat-flow/ruleset";
import { ref } from "vue";
import type { Ref } from "vue";
import { useEditorStore } from "../stores/editor.ts";

export interface UseKeywordLint {
  keywordDiagnostics: Ref<Diagnostic[]>;
  runKeywordLint: () => void;
  clear: () => void;
}

export function useKeywordLint(): UseKeywordLint {
  const store = useEditorStore();
  const keywordDiagnostics = ref<Diagnostic[]>([]);

  function runKeywordLint(): void {
    keywordDiagnostics.value = lintMarkdown(store.content);
  }

  function clear(): void {
    keywordDiagnostics.value = [];
  }

  return { keywordDiagnostics, runKeywordLint, clear };
}
