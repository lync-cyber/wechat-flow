import { describeTheme, parseFrontmatter, upsertFrontmatterPaint } from "@wechat-flow/core";
import { computed } from "vue";
import type { ComputedRef } from "vue";
import { useEditorStore } from "../stores/editor.ts";

export interface UsePaintBinding {
  paintableTokens: ComputedRef<string[]>;
  currentPaint: ComputedRef<Record<string, string>>;
  themeDefaults: ComputedRef<Record<string, string>>;
  setPaint: (tokenId: string, color: string) => void;
  clearPaint: (tokenId: string) => void;
  applyPaint: (paint: Record<string, string>) => void;
  resetPaint: () => void;
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

  const themeDefaults = computed<Record<string, string>>(() => {
    return describeTheme(store.currentTheme)?.tokens ?? {};
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

  function applyPaint(paint: Record<string, string>): void {
    store.setContent(upsertFrontmatterPaint(store.content, paint));
  }

  function resetPaint(): void {
    store.setContent(upsertFrontmatterPaint(store.content, {}));
  }

  return {
    paintableTokens,
    currentPaint,
    themeDefaults,
    setPaint,
    clearPaint,
    applyPaint,
    resetPaint,
  };
}
