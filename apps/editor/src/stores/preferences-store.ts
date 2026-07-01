import { loadEditorPreferences, saveEditorPreferences } from "@wechat-flow/core";
import { defineStore } from "pinia";
import { ref } from "vue";

export interface EditorPreferencesPatch {
  inputAssist?: boolean;
  fontSize?: number;
  lineHeight?: number;
}

export const usePreferencesStore = defineStore("preferences", () => {
  const inputAssist = ref(false);
  const fontSize = ref(16);
  const lineHeight = ref(1.75);

  async function init(): Promise<void> {
    try {
      const saved = await loadEditorPreferences();
      if (typeof saved?.inputAssist === "boolean") {
        inputAssist.value = saved.inputAssist;
      }
      if (typeof saved?.fontSize === "number") {
        fontSize.value = saved.fontSize;
      }
      if (typeof saved?.lineHeight === "number") {
        lineHeight.value = saved.lineHeight;
      }
    } catch {
      // Storage unavailable (db closed / private browsing) — keep defaults
    }
  }

  async function updatePreferences(patch: EditorPreferencesPatch): Promise<void> {
    if (patch.inputAssist !== undefined) inputAssist.value = patch.inputAssist;
    if (patch.fontSize !== undefined) fontSize.value = patch.fontSize;
    if (patch.lineHeight !== undefined) lineHeight.value = patch.lineHeight;

    await saveEditorPreferences({
      inputAssist: inputAssist.value,
      fontSize: fontSize.value,
      lineHeight: lineHeight.value,
    });
  }

  return { inputAssist, fontSize, lineHeight, init, updatePreferences };
});
