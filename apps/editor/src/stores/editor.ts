import { defineStore } from "pinia";
import { ref } from "vue";
import { composeRender } from "../use-cases/render.ts";

export const useEditorStore = defineStore("editor", () => {
  const currentDocId = ref<string | null>(null);
  const currentTheme = ref<string>("default");
  const previewHtml = ref<string>("");

  async function updatePreview(markdown: string): Promise<void> {
    const result = await composeRender({ markdown, themeId: currentTheme.value });
    previewHtml.value = result.html;
  }

  return { currentDocId, currentTheme, previewHtml, updatePreview };
});
