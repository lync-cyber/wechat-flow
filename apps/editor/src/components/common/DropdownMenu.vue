<script setup lang="ts">
export interface MenuActionItem {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
}

export interface MenuSeparatorItem {
  type: "separator";
}

export type MenuItem = MenuActionItem | MenuSeparatorItem;

const props = defineProps<{
  isOpen: boolean;
  items: MenuItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
}>();

function isSeparator(item: MenuItem): item is MenuSeparatorItem {
  return "type" in item && item.type === "separator";
}

function handleClick(item: MenuItem): void {
  if (isSeparator(item)) return;
  if (item.disabled) return;
  props.onSelect(item.id);
  props.onClose();
}
</script>

<template>
  <div
    v-if="isOpen"
    class="dropdown-menu"
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
        <span class="dropdown-menu__item-label">{{ item.label }}</span>
        <kbd v-if="item.shortcut" class="dropdown-menu__item-shortcut">{{ item.shortcut }}</kbd>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dropdown-menu {
  min-width: 160px;
  max-width: 280px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-base);
  z-index: var(--z-dropdown);
  overflow: hidden;
  padding: var(--space-1) 0;
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
