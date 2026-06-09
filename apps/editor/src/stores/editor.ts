import { loadDocument, saveDraft } from "@wechat-flow/core";
import { defineStore } from "pinia";
import { ref } from "vue";
import type { NodeLocation } from "../components/source/source-cursor-tracker.ts";
import { composeRender } from "../use-cases/render.ts";

const DEFAULT_DOC_ID = "draft-default";

export const useEditorStore = defineStore("editor", () => {
  const currentDocId = ref<string>(DEFAULT_DOC_ID);
  const currentTheme = ref<string>("default");
  const previewHtml = ref<string>("");
  const content = ref<string>("");
  const nodeLocations = ref<NodeLocation[]>([]);

  async function updatePreview(markdown: string): Promise<void> {
    const result = await composeRender({
      markdown,
      themeId: currentTheme.value,
      injectNodeIds: true,
    });
    previewHtml.value = result.html;
    nodeLocations.value = result.nodeLocations;
  }

  function persistDraft(markdown: string): void {
    saveDraft({
      id: currentDocId.value,
      title: "Untitled",
      content: markdown,
      updatedAt: Date.now(),
    }).catch(() => {
      // Storage unavailable — in-memory state is still updated
    });
  }

  async function setContent(markdown: string): Promise<void> {
    if (content.value === markdown) return;
    content.value = markdown;
    persistDraft(markdown);
    await updatePreview(markdown);
  }

  async function loadDraft(): Promise<void> {
    try {
      const record = await loadDocument(currentDocId.value);
      if (record) {
        content.value = record.content;
        await updatePreview(record.content);
      }
    } catch {
      // Storage unavailable (e.g. private browsing, test teardown) — start with empty content
    }
  }

  return {
    currentDocId,
    currentTheme,
    previewHtml,
    content,
    nodeLocations,
    updatePreview,
    setContent,
    loadDraft,
  };
});
