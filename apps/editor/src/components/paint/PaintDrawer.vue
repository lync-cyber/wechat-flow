<script setup lang="ts">
import { usePaintBinding } from "../../composables/use-paint-binding.ts";

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { paintableTokens, currentPaint, setPaint } = usePaintBinding();

function onPick(token: string, event: Event): void {
  const color = (event.target as HTMLInputElement).value;
  setPaint(token, color);
}
</script>

<template>
  <div
    v-if="isOpen"
    class="paint-drawer"
    data-testid="paint-drawer"
    :style="{ width: '320px' }"
  >
    <div class="paint-drawer__header" data-testid="paint-drawer-header">
      <span class="paint-drawer__title">自定义配色</span>
      <button
        type="button"
        class="paint-drawer__close"
        data-testid="paint-drawer-close"
        aria-label="关闭"
        @click="emit('close')"
      >✕</button>
    </div>

    <div class="paint-drawer__list" data-testid="paint-drawer-list">
      <div
        v-if="paintableTokens.length === 0"
        class="paint-drawer__empty"
        data-testid="paint-drawer-empty"
      >
        当前主题未声明可配色 token
      </div>
      <div
        v-for="token in paintableTokens"
        :key="token"
        class="paint-drawer__row"
        :data-testid="`paint-token-${token}`"
      >
        <span class="paint-drawer__token-name">{{ token }}</span>
        <input
          type="color"
          class="paint-drawer__color-input"
          :value="currentPaint[token] ?? '#000000'"
          @input="onPick(token, $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.paint-drawer {
  position: fixed;
  top: 48px;
  right: 0;
  bottom: 0;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  z-index: var(--z-dropdown);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: drawer-slide-in var(--duration-base) var(--ease-standard);
}

@keyframes drawer-slide-in {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.paint-drawer__header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
}

.paint-drawer__title {
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.paint-drawer__close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  font-size: 16px;
  padding: 4px;
  border-radius: var(--radius-base);
}

.paint-drawer__close:hover {
  background: var(--color-surface-overlay);
  color: var(--color-text-primary);
}

.paint-drawer__list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.paint-drawer__empty {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  padding: var(--space-4) 0;
}

.paint-drawer__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.paint-drawer__token-name {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.paint-drawer__color-input {
  width: 40px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  cursor: pointer;
  padding: 0 2px;
  flex-shrink: 0;
}
</style>
