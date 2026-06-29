<script setup lang="ts">
import { listDocuments } from "@wechat-flow/core";
import { onMounted, ref, watch } from "vue";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  "select-doc": [id: string];
  close: [];
}>();

interface DocMeta {
  id: string;
  title: string;
  updatedAt: number;
}

const docs = ref<DocMeta[]>([]);

async function loadDocs(): Promise<void> {
  docs.value = await listDocuments();
}

onMounted(() => {
  if (props.open) {
    loadDocs();
  }
});

watch(
  () => props.open,
  (val) => {
    if (val) {
      loadDocs();
    }
  }
);

function selectDoc(id: string): void {
  emit("select-doc", id);
  emit("close");
}
</script>

<template>
  <Transition name="sheet-slide">
    <div
      v-show="open"
      class="document-list-sheet"
      data-testid="document-list-sheet"
      style="max-height: 60vh;"
    >
      <div class="document-list-sheet__handle" aria-hidden="true" />
      <div class="document-list-sheet__list">
        <button
          v-for="doc in docs"
          :key="doc.id"
          type="button"
          class="document-list-sheet__item"
          :data-testid="`doc-item-${doc.id}`"
          @click="selectDoc(doc.id)"
        >
          <span class="document-list-sheet__title">{{ doc.title }}</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.document-list-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--z-mobile-bar, 200);
  background: var(--color-surface, #fff);
  border-top: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-lg, 12px) var(--radius-lg, 12px) 0 0;
  overflow-y: auto;
  box-sizing: border-box;
}

.document-list-sheet__handle {
  width: 40px;
  height: 4px;
  background: var(--color-border, #e5e7eb);
  border-radius: 2px;
  margin: 8px auto 4px;
}

.document-list-sheet__list {
  padding: 8px 0 env(safe-area-inset-bottom, 0);
}

.document-list-sheet__item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: var(--font-size-base, 14px);
  color: var(--color-text-primary, #111827);
  min-height: 44px;
  box-sizing: border-box;
}

.document-list-sheet__item:active {
  background: var(--color-surface-elevated, #f9fafb);
}

.document-list-sheet__title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: transform var(--duration-base, 200ms) ease;
}

.sheet-slide-enter-from,
.sheet-slide-leave-to {
  transform: translateY(100%);
}
</style>
