import type { EditorView } from "@codemirror/view";
import { composeApplyZhTypo } from "@wechat-flow/core";
import type { DiffEntry } from "@wechat-flow/core";
import { ref } from "vue";
import { useEditorStore } from "../stores/editor.ts";
import { useToast } from "./use-toast.ts";

export interface ZhTypoConfirmOptions {
  editorView?: EditorView | null;
}

export function useZhTypo() {
  const isPreviewOpen = ref(false);
  const diff = ref<DiffEntry[]>([]);
  const perRule = ref<Record<string, number>>({});
  const totalChanges = ref(0);
  const pendingFixed = ref("");

  function openZhTypoPreview(markdown: string): void {
    const result = composeApplyZhTypo({ markdown });
    pendingFixed.value = result.fixed;
    diff.value = result.diff;
    perRule.value = result.perRule;
    totalChanges.value = result.totalChanges;
    isPreviewOpen.value = true;
  }

  async function confirmRevision(options?: ZhTypoConfirmOptions): Promise<void> {
    const fixed = pendingFixed.value;
    const n = totalChanges.value;
    const view = options?.editorView ?? null;

    const { pushToast } = useToast();

    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: fixed },
      });
    } else {
      const store = useEditorStore();
      await store.setContent(fixed);
      pushToast({ type: "error", message: "编辑器未就绪，本次修订未纳入撤销栈" });
    }

    pushToast({ type: "success", message: `已修订 ${n} 处` });

    isPreviewOpen.value = false;
  }

  function cancel(): void {
    isPreviewOpen.value = false;
  }

  function hasZhTypoIssues(markdown: string): boolean {
    if (!markdown.trim()) return false;
    const result = composeApplyZhTypo({ markdown });
    return result.totalChanges > 0;
  }

  return {
    isPreviewOpen,
    diff,
    perRule,
    totalChanges,
    openZhTypoPreview,
    confirmRevision,
    cancel,
    hasZhTypoIssues,
  };
}
