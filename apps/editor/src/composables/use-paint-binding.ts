import { describeTheme, parseFrontmatter, upsertFrontmatterPaint } from "@wechat-flow/core";
import { computed } from "vue";
import type { ComputedRef } from "vue";
import { useEditorStore } from "../stores/editor.ts";

export interface UsePaintBinding {
  paintableTokens: ComputedRef<string[]>;
  currentPaint: ComputedRef<Record<string, string>>;
  setPaint: (tokenId: string, color: string) => void;
  clearPaint: (tokenId: string) => void;
}

export function usePaintBinding(): UsePaintBinding {
  const store = useEditorStore();

  const paintableTokens = computed<string[]>(() => {
    const def = describeTheme(store.currentTheme);
    if (!def) return [];
    const p = def.paintable;
    return Array.isArray(p) ? (p as string[]) : [];
  });

  const currentPaint = computed<Record<string, string>>(() => {
    return parseFrontmatter(store.content).meta.paint ?? {};
  });

  function setPaint(tokenId: string, color: string): void {
    const next = { ...currentPaint.value, [tokenId]: color };
    store.setContent(upsertFrontmatterPaint(store.content, next));
  }

  function clearPaint(tokenId: string): void {
    const next = { ...currentPaint.value };
    delete next[tokenId];
    store.setContent(upsertFrontmatterPaint(store.content, next));
  }

  return { paintableTokens, currentPaint, setPaint, clearPaint };
}
