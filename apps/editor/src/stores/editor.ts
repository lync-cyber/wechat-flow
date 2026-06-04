import { defineStore } from "pinia";
import { ref } from "vue";

export const useEditorStore = defineStore("editor", () => {
  const currentDocId = ref<string | null>(null);
  const currentTheme = ref<string>("default");

  return { currentDocId, currentTheme };
});
