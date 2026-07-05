<script setup lang="ts">
import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/vue";
import { computed, onBeforeUnmount, ref, toRef, watch } from "vue";

export interface MenuActionItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
}

export interface MenuSeparatorItem {
  type: "separator";
}

export type MenuItem = MenuActionItem | MenuSeparatorItem;

export type MenuPlacement = "bottom-end" | "bottom-start";

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    items: MenuItem[];
    anchor?: HTMLElement | null;
    placement?: MenuPlacement;
    onSelect: (id: string) => void;
    onClose: () => void;
  }>(),
  { anchor: null, placement: "bottom-end" }
);

const menuRef = ref<HTMLElement | null>(null);
const anchorRef = computed(() => props.anchor ?? null);

const { floatingStyles } = useFloating(anchorRef, menuRef, {
  placement: toRef(props, "placement"),
  strategy: "fixed",
  transform: false,
  middleware: [offset(4), flip(), shift({ padding: 8 })],
  whileElementsMounted: autoUpdate,
});

function isSeparator(item: MenuItem): item is MenuSeparatorItem {
  return "type" in item && item.type === "separator";
}

function handleClick(item: MenuItem): void {
  if (isSeparator(item)) return;
  if (item.disabled) return;
  props.onSelect(item.id);
  props.onClose();
}

function onDocumentPointerDown(event: PointerEvent): void {
  const target = event.target as Node | null;
  if (!target) return;
  if (menuRef.value?.contains(target)) return;
  if (props.anchor?.contains(target)) return;
  props.onClose();
}

function onDocumentKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") props.onClose();
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      document.addEventListener("pointerdown", onDocumentPointerDown, true);
      document.addEventListener("keydown", onDocumentKeydown);
    } else {
      document.removeEventListener("pointerdown", onDocumentPointerDown, true);
      document.removeEventListener("keydown", onDocumentKeydown);
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown, true);
  document.removeEventListener("keydown", onDocumentKeydown);
});
</script>

<template>
  <div
    v-if="isOpen"
    ref="menuRef"
    class="dropdown-menu"
    :style="anchor ? floatingStyles : undefined"
    data-testid="dropdown-menu"
    role="menu"
  >
    <template v-for="(item, idx) in items" :key="isSeparator(item) ? `sep-${idx}` : item.id">
      <div
        v-if="isSeparator(item)"
        class="dropdown-menu__separator"
        data-testid="menu-separator"
        role="separator"
      />
      <div
        v-else
        class="dropdown-menu__item"
        :class="{ 'dropdown-menu__item--disabled': item.disabled }"
        :data-testid="`menu-item-${item.id}`"
        role="menuitem"
        :aria-disabled="item.disabled ?? false"
        @click="handleClick(item)"
      >
        <span v-if="item.icon" class="dropdown-menu__item-icon" aria-hidden="true">{{ item.icon }}</span>
        <span class="dropdown-menu__item-label">{{ item.label }}</span>
        <kbd v-if="item.shortcut" class="dropdown-menu__item-shortcut">{{ item.shortcut }}</kbd>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dropdown-menu {
  position: fixed;
  min-width: 160px;
  max-width: 280px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-base);
  z-index: var(--z-dropdown);
  overflow: hidden;
  padding: var(--space-1) 0;
  animation: dropdown-menu-in 0.12s ease-out;
}

@keyframes dropdown-menu-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dropdown-menu {
    animation: none;
  }
}

.dropdown-menu__separator {
  height: 1px;
  background: var(--color-border-subtle);
  margin: var(--space-1) 0;
}

.dropdown-menu__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  padding: 0 var(--space-3);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  gap: var(--space-3);
}

.dropdown-menu__item:hover:not(.dropdown-menu__item--disabled) {
  background: var(--color-surface-overlay);
}

.dropdown-menu__item--disabled {
  opacity: 0.4;
  cursor: default;
  pointer-events: none;
}

.dropdown-menu__item-icon {
  flex-shrink: 0;
  width: 16px;
  text-align: center;
  color: var(--color-text-secondary);
}

.dropdown-menu__item:hover:not(.dropdown-menu__item--disabled) .dropdown-menu__item-icon {
  color: var(--color-brand);
}

.dropdown-menu__item-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-menu__item-shortcut {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  padding: 1px 5px;
  font-family: var(--font-mono);
  flex-shrink: 0;
}
</style>
