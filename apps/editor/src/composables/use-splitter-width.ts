import { loadSplitterWidth, saveSplitterWidth } from "@wechat-flow/core";
import { ref } from "vue";

export function useSplitterWidth(
  panelId: string,
  defaultWidth: number,
  minWidth: number,
  maxWidth: number
) {
  const width = ref(defaultWidth);

  function clamp(value: number): number {
    return Math.min(maxWidth, Math.max(minWidth, value));
  }

  async function init(): Promise<void> {
    try {
      const saved = await loadSplitterWidth(panelId);
      if (saved !== undefined) {
        width.value = clamp(saved);
      }
    } catch {
      // Storage unavailable (db closed / private browsing) — keep default width
    }
  }

  async function onResize(newWidth: number): Promise<void> {
    width.value = clamp(newWidth);
    await saveSplitterWidth(panelId, width.value);
  }

  return { width, init, onResize };
}
