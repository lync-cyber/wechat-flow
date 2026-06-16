<script setup lang="ts">
import type { BlockDefinition } from "@wechat-flow/core";
import type { MarkDefinition } from "@wechat-flow/core";
import { computed, ref, watch } from "vue";
import { buildCandidates } from "../../editor/extensions/directive-completion.ts";

const props = defineProps<{
  isOpen: boolean;
  triggerType: "block" | "inline";
  blocks: BlockDefinition[];
  marks: MarkDefinition[];
  currentInput: string;
  onSelect: (payload: { type: "block" | "inline"; blockId: string }) => void;
  onClose: () => void;
}>();

const activeIndex = ref(0);

const candidates = computed(() =>
  buildCandidates(props.triggerType, props.currentInput, props.blocks, props.marks)
);

watch(candidates, () => {
  activeIndex.value = 0;
});

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === "Escape") {
    props.onClose();
  }
}

function handleClick(index: number): void {
  const candidate = candidates.value[index];
  if (candidate) {
    props.onSelect({ type: candidate.type, blockId: candidate.id });
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="directive-autocomplete-popover"
    @keydown="handleKeydown"
  >
    <div
      v-for="(candidate, index) in candidates"
      :key="candidate.id"
      data-testid="autocomplete-item"
      class="autocomplete-item"
      :class="{ active: index === activeIndex }"
      :aria-selected="index === activeIndex ? 'true' : 'false'"
      @click="handleClick(index)"
    >
      <span class="autocomplete-item__id">{{ candidate.id }}</span>
      <span class="autocomplete-item__name">{{ candidate.name }}</span>
      <span class="autocomplete-item__type">{{ candidate.type }}</span>
    </div>
  </div>
</template>

<style scoped>
.directive-autocomplete-popover {
  width: 280px;
  max-height: 320px;
  overflow-y: auto;
  background: var(--color-surface, #faf8f5);
  border: 1px solid var(--color-border, #d4cfc6);
  box-shadow: var(--shadow-base, 0 2px 8px rgba(0, 0, 0, 0.12));
  border-radius: var(--radius-md, 6px);
  z-index: var(--z-dropdown, 200);
  position: absolute;
}

.autocomplete-item {
  height: 36px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
  cursor: pointer;
}

.autocomplete-item.active {
  background: var(--color-surface-elevated, #f4f1ec);
}

.autocomplete-item__name {
  flex: 1;
  font-size: var(--font-size-sm, 13px);
}

.autocomplete-item__type {
  font-size: var(--font-size-xs, 11px);
  color: var(--color-text-secondary, #8a7d6b);
}
</style>
