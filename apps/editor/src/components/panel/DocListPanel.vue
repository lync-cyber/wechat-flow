<script setup lang="ts">
import { listDocuments } from "@wechat-flow/core";
import type { DocumentMeta } from "@wechat-flow/core";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useEditorStore } from "../../stores/editor.ts";

const router = useRouter();
const store = useEditorStore();

const isLoading = ref(true);
const docs = ref<DocumentMeta[]>([]);

function formatUpdatedAt(updatedAt: number): string {
  return new Date(updatedAt).toLocaleString();
}

function goToThemes(): void {
  router.push("/themes");
}

function openDoc(id: string): void {
  router.push(`/docs/${id}`);
}

onMounted(async () => {
  isLoading.value = true;
  try {
    docs.value = await listDocuments();
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="doc-list-panel">
    <div class="doc-list-panel__header">
      <button
        type="button"
        class="doc-list-panel__new-btn"
        data-testid="doc-list-new"
        @click="goToThemes"
      >
        + 新建
      </button>
    </div>

    <div class="doc-list-panel__body">
      <template v-if="isLoading">
        <div
          v-for="(width, i) in ['70%', '50%', '70%']"
          :key="i"
          class="doc-list-panel__skeleton"
          data-testid="doc-list-skeleton"
          :style="{ width }"
        />
      </template>

      <template v-else-if="docs.length === 0">
        <div class="doc-list-panel__empty">
          <p class="doc-list-panel__empty-text">还没有文档</p>
          <a
            href="#"
            class="doc-list-panel__empty-link"
            data-testid="doc-list-create-first"
            @click.prevent="goToThemes"
          >创建第一篇</a>
        </div>
      </template>

      <template v-else>
        <div
          v-for="doc in docs"
          :key="doc.id"
          class="doc-list-panel__item"
          :class="{ 'doc-list-panel__item--active': doc.id === store.currentDocId }"
          :data-testid="`doc-item-${doc.id}`"
          role="button"
          tabindex="0"
          @click="openDoc(doc.id)"
          @keydown.enter="openDoc(doc.id)"
        >
          <span class="doc-list-panel__item-title">{{ doc.title }}</span>
          <span class="doc-list-panel__item-subtitle">{{ formatUpdatedAt(doc.updatedAt) }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.doc-list-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.doc-list-panel__header {
  flex-shrink: 0;
  height: 40px;
  padding: 4px;
}

.doc-list-panel__new-btn {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: var(--radius-sm, 4px);
  background: var(--color-brand);
  color: #fff;
  font-size: var(--font-size-sm, 13px);
  cursor: pointer;
}

.doc-list-panel__new-btn:hover {
  background: var(--color-brand-hover);
}

.doc-list-panel__body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.doc-list-panel__skeleton {
  height: 44px;
  margin: 4px 12px;
  border-radius: var(--radius-sm, 4px);
  background: var(--color-surface-sunken);
  animation: doc-list-panel-pulse 1.2s ease-in-out infinite;
}

@keyframes doc-list-panel-pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.doc-list-panel__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
}

.doc-list-panel__empty-text {
  font-size: 14px;
  color: var(--color-text-muted);
  margin: 0;
}

.doc-list-panel__empty-link {
  font-size: var(--font-size-sm, 13px);
  color: var(--color-brand);
  text-decoration: none;
  cursor: pointer;
}

.doc-list-panel__empty-link:hover {
  text-decoration: underline;
}

.doc-list-panel__item {
  height: 44px;
  padding: 0 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-bottom: 1px solid var(--color-border-subtle);
  border-left: 2px solid transparent;
  cursor: pointer;
  overflow: hidden;
}

.doc-list-panel__item:hover {
  background: var(--color-surface-overlay);
}

.doc-list-panel__item--active {
  border-left: 2px solid var(--color-brand);
  background: var(--color-brand-subtle);
}

.doc-list-panel__item--active .doc-list-panel__item-title {
  color: var(--color-brand);
}

.doc-list-panel__item-title {
  font-size: 14px;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-list-panel__item-subtitle {
  font-size: 11px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
