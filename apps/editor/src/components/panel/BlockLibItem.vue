<script setup lang="ts">
import type { BlockDefinition } from "@wechat-flow/core";

const props = defineProps<{
  block: BlockDefinition;
  variants?: Array<{ id: string; label?: string }>;
  isExpanded?: boolean;
  disabled?: boolean;
  onInsert: (block: BlockDefinition) => void;
  onExpandToggle?: () => void;
  onDragStart?: (block: BlockDefinition) => void;
}>();

function handleClick(): void {
  if (!props.disabled) {
    props.onInsert(props.block);
  }
}

const variantCount = props.variants?.length ?? props.block.variants?.length ?? 0;
</script>

<template>
  <div
    class="block-lib-item"
    :class="{ 'block-lib-item--disabled': disabled, 'block-lib-item--expanded': isExpanded }"
    data-testid="block-lib-item"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
  >
    <span class="block-lib-item__icon" aria-hidden="true">⬜</span>
    <span class="block-lib-item__name" data-testid="block-name">{{ block.name }}</span>
    <span
      v-if="variantCount > 0"
      class="block-lib-item__variant-badge"
      data-testid="variant-badge"
    >{{ variantCount }} 款皮肤</span>
  </div>
</template>

<style scoped>
.block-lib-item {
  height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.block-lib-item:hover {
  background: var(--color-surface-overlay);
}

.block-lib-item:hover .block-lib-item__icon {
  color: var(--color-brand);
}

.block-lib-item--disabled {
  opacity: 0.4;
  cursor: default;
}

.block-lib-item__icon {
  font-size: 16px;
  flex-shrink: 0;
}

.block-lib-item__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.block-lib-item__variant-badge {
  font-size: 12px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}
</style>
