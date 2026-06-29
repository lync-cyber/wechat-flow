<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import PreviewPane from "../components/editor/PreviewPane.vue";
import DocumentListSheet from "../components/mobile/DocumentListSheet.vue";
import MobileBottomBar from "../components/mobile/MobileBottomBar.vue";
import { useToast } from "../composables/use-toast.ts";
import { useEditorStore } from "../stores/editor.ts";
import { mobileCopy } from "../use-cases/mobile-copy.ts";

const route = useRoute();
const router = useRouter();
const store = useEditorStore();
const { pushToast } = useToast();

const docId = computed(() => route.params.docId as string);
const sheetOpen = ref(false);

onMounted(async () => {
  if (docId.value) {
    store.currentDocId = docId.value;
  }
  await store.loadDraft();
});

async function handleCopy(): Promise<void> {
  await mobileCopy({
    markdown: store.content,
    themeId: store.currentTheme,
    previewHtml: store.previewHtml,
    notify: pushToast,
  });
}

function openDocList(): void {
  sheetOpen.value = true;
}

function handleSelectDoc(id: string): void {
  sheetOpen.value = false;
  router.push(`/preview/${id}`);
}

const docTitle = computed(() => store.currentDocId || "文档");
</script>

<template>
  <div class="preview-page">
    <!-- Simplified top bar -->
    <header
      class="preview-page__topbar"
      data-testid="preview-topbar"
      style="height: 48px;"
    >
      <span class="preview-page__logo">WechatFlow</span>
      <span class="preview-page__doc-name">{{ docTitle }}</span>
    </header>

    <!-- Preview area: 100vh - 48px topbar - 56px bottom bar -->
    <main class="preview-page__content">
      <div
        class="preview-page__viewport"
        data-testid="preview-viewport-container"
        style="width: 375px;"
      >
        <PreviewPane
          :html-content="store.previewHtml"
          viewport="375"
        />
      </div>
    </main>

    <!-- Bottom bar -->
    <MobileBottomBar
      :doc-title="docTitle"
      @open-doc-list="openDocList"
      @copy="handleCopy"
    />

    <!-- Document list bottom sheet -->
    <DocumentListSheet
      :open="sheetOpen"
      @select-doc="handleSelectDoc"
      @close="sheetOpen = false"
    />
  </div>
</template>

<style scoped>
.preview-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-surface, #fff);
  overflow: hidden;
}

.preview-page__topbar {
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
  background: var(--color-surface-elevated, #fff);
  box-sizing: border-box;
}

.preview-page__logo {
  font-weight: var(--font-weight-bold, 700);
  font-size: var(--font-size-base, 14px);
  color: var(--color-brand, #2d5a4e);
  flex-shrink: 0;
}

.preview-page__doc-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-secondary, #6b7280);
}

.preview-page__content {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: 16px;
  /* leave room for 56px bottom bar */
  padding-bottom: 72px;
  box-sizing: border-box;
}

.preview-page__viewport {
  max-width: 100%;
  flex-shrink: 0;
}
</style>
