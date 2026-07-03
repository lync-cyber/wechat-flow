<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    title: string;
    variant?: "confirm" | "form";
    size?: "sm" | "md" | "lg";
    onClose: () => void;
  }>(),
  {
    variant: undefined,
    size: "sm",
  }
);

const emit = defineEmits<{
  confirm: [];
}>();

const confirmLabel = computed(() => (props.variant === "form" ? "保存" : "确认"));

const panelRef = ref<HTMLElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

watch(
  () => props.isOpen,
  async (open) => {
    if (open) {
      previouslyFocused = document.activeElement as HTMLElement | null;
      await nextTick();
      const first = panelRef.value?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? panelRef.value)?.focus();
    } else {
      previouslyFocused?.focus();
      previouslyFocused = null;
    }
  }
);

function onBackdropClick(): void {
  if (props.variant === "confirm") return;
  props.onClose();
}

function trapTab(e: KeyboardEvent): void {
  const nodes = panelRef.value?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  if (!nodes || nodes.length === 0) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function onKeyDown(e: KeyboardEvent): void {
  if (!props.isOpen) return;
  if (e.key === "Escape") {
    props.onClose();
    return;
  }
  if (e.key === "Tab") {
    trapTab(e);
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeyDown);
});
</script>

<template>
  <div
    v-if="isOpen"
    class="base-modal__backdrop"
    data-testid="base-modal-backdrop"
    @click.self="onBackdropClick"
  >
    <div
      ref="panelRef"
      class="base-modal"
      :class="`base-modal--${size}`"
      data-testid="base-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      tabindex="-1"
    >
      <div class="base-modal__header">
        <h2 class="base-modal__title">{{ title }}</h2>
      </div>

      <div class="base-modal__content">
        <slot />
      </div>

      <div class="base-modal__footer">
        <slot name="footer">
          <button
            type="button"
            class="base-modal__btn base-modal__btn--ghost"
            data-testid="base-modal-cancel"
            @click="onClose"
          >
            取消
          </button>
          <button
            type="button"
            class="base-modal__btn base-modal__btn--primary"
            data-testid="base-modal-confirm"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.base-modal__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(28, 25, 23, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: calc(var(--z-modal) - 1);
}

.base-modal {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: var(--z-modal);
}

.base-modal--sm {
  width: 480px;
}

.base-modal--md {
  width: 560px;
}

.base-modal--lg {
  width: 720px;
}

.base-modal__header {
  padding: var(--space-6) var(--space-6) 0;
  flex-shrink: 0;
}

.base-modal__title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.base-modal__content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
}

.base-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: 0 var(--space-6) var(--space-6);
  flex-shrink: 0;
}

.base-modal__btn {
  height: 32px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-base);
  font-size: var(--font-size-sm);
  cursor: pointer;
  border: 1px solid transparent;
}

.base-modal__btn--ghost {
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

.base-modal__btn--primary {
  background: var(--color-brand);
  border-color: var(--color-brand);
  color: var(--color-text-inverse);
}

.base-modal__btn--primary:hover {
  background: var(--color-brand-hover);
}
</style>
