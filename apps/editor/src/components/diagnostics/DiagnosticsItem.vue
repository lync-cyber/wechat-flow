<script setup lang="ts">
import type { Diagnostic } from "@wechat-flow/contracts";

defineProps<{
  diagnostic: Diagnostic;
}>();

defineEmits<{
  showDiff: [nodeSelector: string];
}>();
</script>

<template>
  <div class="diagnostics-item" :data-severity="diagnostic.severity">
    <div class="diagnostics-item__swatch" :class="`diagnostics-item__swatch--${diagnostic.severity}`" />
    <span class="diagnostics-item__message">{{ diagnostic.message }}</span>
    <button
      v-if="diagnostic.nodeRef"
      type="button"
      class="diagnostics-item__diff-link"
      data-testid="show-diff-btn"
      @click="$emit('showDiff', diagnostic.nodeRef!)"
    >查看变更</button>
  </div>
</template>

<style scoped>
.diagnostics-item {
  display: flex;
  align-items: center;
  height: 36px;
  gap: var(--space-2, 8px);
  padding: 0 var(--space-3, 12px);
}

.diagnostics-item__swatch {
  width: 4px;
  height: 36px;
  flex-shrink: 0;
}

.diagnostics-item__swatch--error {
  background: var(--color-diag-error);
}

.diagnostics-item__swatch--warning {
  background: var(--color-diag-warn);
}

.diagnostics-item__swatch--info {
  background: var(--color-diag-safe);
}

.diagnostics-item__message {
  flex: 1;
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.diagnostics-item__diff-link {
  border: none;
  background: none;
  color: var(--color-text-link);
  font-size: var(--font-size-sm, 13px);
  cursor: pointer;
  padding: 0 var(--space-1, 4px);
  flex-shrink: 0;
}

.diagnostics-item__diff-link:hover {
  color: var(--color-text-link-hover);
  text-decoration: underline;
}
</style>
