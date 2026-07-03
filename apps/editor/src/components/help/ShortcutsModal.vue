<script setup lang="ts">
import { computed } from "vue";
import { listShortcutEntries } from "../../lib/command-registry.ts";
import BaseModal from "../common/BaseModal.vue";

const props = defineProps<{
  isOpen: boolean;
  onClose: () => void;
}>();

const groups = computed(() => {
  const map = new Map<string, { label: string; shortcut: string }[]>();
  for (const entry of listShortcutEntries()) {
    const list = map.get(entry.group) ?? [];
    list.push({ label: entry.label, shortcut: entry.shortcut });
    map.set(entry.group, list);
  }
  return map;
});
</script>

<template>
  <BaseModal
    :is-open="isOpen"
    title="快捷键手册"
    variant="confirm"
    size="md"
    :on-close="onClose"
  >
    <div data-testid="shortcuts-modal" class="shortcuts-modal">
      <div
        v-for="[group, entries] in groups"
        :key="group"
        class="shortcuts-modal__group"
        :data-testid="`shortcuts-group-${group}`"
      >
        <h3 class="shortcuts-modal__group-title">{{ group }}</h3>
        <div
          v-for="entry in entries"
          :key="entry.label"
          class="shortcuts-modal__row"
        >
          <span class="shortcuts-modal__label">{{ entry.label }}</span>
          <kbd class="shortcuts-modal__kbd">{{ entry.shortcut }}</kbd>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="shortcuts-modal__close-btn"
        data-testid="shortcuts-modal-close"
        @click="props.onClose"
      >
        关闭
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.shortcuts-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.shortcuts-modal__group-title {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.shortcuts-modal__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-1) 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.shortcuts-modal__kbd {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  padding: 1px 6px;
}

.shortcuts-modal__close-btn {
  height: 32px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-base);
  font-size: var(--font-size-sm);
  cursor: pointer;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-primary);
}
</style>
