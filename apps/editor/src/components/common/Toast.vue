<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";

const props = defineProps<{
  type: "info" | "success" | "warning" | "error";
  message: string;
  duration?: number;
  onClose: () => void;
}>();

const AUTO_CLOSE_DURATIONS: Record<string, number | null> = {
  info: 3000,
  success: 3000,
  warning: 5000,
  error: null,
};

let timerId: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  const duration = props.duration ?? AUTO_CLOSE_DURATIONS[props.type];
  if (duration !== null && duration !== undefined) {
    timerId = setTimeout(() => {
      props.onClose();
    }, duration);
  }
});

onUnmounted(() => {
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
});
</script>

<template>
  <div
    :class="['toast', `toast--${type}`]"
    :data-testid="`toast-${type}`"
    role="alert"
  >
    <span class="toast__message" data-testid="toast-message">{{ message }}</span>
    <button
      class="toast__close"
      data-testid="toast-close"
      type="button"
      aria-label="关闭"
      @click="onClose"
    >✕</button>
  </div>
</template>

<style scoped>
.toast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 320px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-base);
  padding: var(--space-3) var(--space-4);
  gap: var(--space-3);
}

.toast--info {
  background: var(--color-info-subtle);
  border-left: 3px solid var(--color-info);
}

.toast--success {
  background: var(--color-success-subtle);
  border-left: 3px solid var(--color-success);
}

.toast--warning {
  background: var(--color-warning-subtle);
  border-left: 3px solid var(--color-warning);
}

.toast--error {
  background: var(--color-error-subtle);
  border-left: 3px solid var(--color-error);
}

.toast__message {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.toast__close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
}
</style>
