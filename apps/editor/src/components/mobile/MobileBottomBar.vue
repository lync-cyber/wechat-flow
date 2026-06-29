<script setup lang="ts">
defineProps<{
  docTitle: string;
}>();

const emit = defineEmits<{
  "open-doc-list": [];
  copy: [];
}>();
</script>

<template>
  <div
    class="mobile-bottom-bar"
    data-testid="mobile-bottom-bar"
    style="height: 56px;"
  >
    <button
      type="button"
      class="mobile-bottom-bar__switch"
      data-testid="btn-switch-doc"
      @click="emit('open-doc-list')"
    >
      <span class="mobile-bottom-bar__doc-title">{{ docTitle }}</span>
      <span class="mobile-bottom-bar__chevron" aria-hidden="true">&#8964;</span>
    </button>

    <button
      type="button"
      class="mobile-bottom-bar__copy"
      data-testid="btn-copy"
      @click="emit('copy')"
    >
      一键复制
    </button>
  </div>
</template>

<style scoped>
.mobile-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--z-mobile-bar, 200);
  background: var(--color-surface, #fff);
  border-top: 1px solid var(--color-border, #e5e7eb);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
  box-sizing: border-box;
}

.mobile-bottom-bar__switch {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-base, 4px);
  padding: 6px 10px;
  cursor: pointer;
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-secondary, #6b7280);
  min-height: 44px;
  overflow: hidden;
}

.mobile-bottom-bar__doc-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.mobile-bottom-bar__chevron {
  flex-shrink: 0;
}

.mobile-bottom-bar__copy {
  flex-shrink: 0;
  min-width: 44px;
  min-height: 44px;
  padding: 8px 16px;
  background: var(--color-brand, #2d5a4e);
  color: var(--color-text-inverse, #fff);
  border: none;
  border-radius: var(--radius-base, 4px);
  font-size: var(--font-size-sm, 13px);
  font-weight: var(--font-weight-medium, 500);
  cursor: pointer;
}

.mobile-bottom-bar__copy:active {
  opacity: 0.85;
}
</style>
