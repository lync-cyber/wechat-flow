<script setup lang="ts">
import type { BlockDefinition } from "@wechat-flow/core/src/registry/block.ts";
import { listBlocks } from "@wechat-flow/core/src/registry/block.ts";
import { computed, ref } from "vue";
import BlockLibItem from "./BlockLibItem.vue";

const props = defineProps<{
  isOpen: boolean;
  onInsert: (directive: string) => void;
  onClose: () => void;
}>();

const blocks = computed(() => listBlocks());
const selectedBlock = ref<BlockDefinition | null>(null);
const paramValues = ref<Record<string, string>>({});

function selectBlock(block: BlockDefinition): void {
  selectedBlock.value = block;
  paramValues.value = {};
}

function buildDirective(block: BlockDefinition, params: Record<string, string>): string {
  const attrs = Object.entries(params)
    .filter(([, v]) => v.trim() !== "")
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
  const attrStr = attrs ? `{${attrs}}` : "";
  return `:::${block.id}${attrStr}\n内容\n:::`;
}

function handleInsert(): void {
  if (!selectedBlock.value) return;
  const directive = buildDirective(selectedBlock.value, paramValues.value);
  props.onInsert(directive);
}

function getParamFields(block: BlockDefinition): Array<{ key: string; type: string }> {
  try {
    const shape = (block.attrsSchema as { shape?: Record<string, unknown> }).shape;
    if (!shape) return [];
    return Object.keys(shape).map((key) => ({ key, type: "text" }));
  } catch {
    return [];
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="insert-drawer"
    data-testid="insert-drawer"
    :style="{ width: '320px' }"
  >
    <div class="insert-drawer__header" data-testid="insert-drawer-header">
      <span class="insert-drawer__title">插入组件</span>
      <button
        type="button"
        class="insert-drawer__close"
        data-testid="insert-drawer-close"
        aria-label="关闭"
        @click="onClose"
      >✕</button>
    </div>

    <div class="insert-drawer__list">
      <BlockLibItem
        v-for="block in blocks"
        :key="block.id"
        :block="block"
        :on-insert="selectBlock"
      />
    </div>

    <div
      v-if="selectedBlock"
      class="insert-drawer__params"
      data-testid="insert-drawer-params"
    >
      <div class="insert-drawer__params-title">{{ selectedBlock.name }} 参数</div>
      <div
        v-for="field in getParamFields(selectedBlock)"
        :key="field.key"
        class="insert-drawer__param-row"
      >
        <label class="insert-drawer__param-label">{{ field.key }}</label>
        <input
          v-model="paramValues[field.key]"
          class="insert-drawer__param-input"
          :data-testid="`param-input-${field.key}`"
          type="text"
          :placeholder="field.key"
        />
      </div>
      <button
        type="button"
        class="insert-drawer__submit"
        data-testid="insert-drawer-submit"
        @click="handleInsert"
      >插入</button>
    </div>
  </div>
</template>

<style scoped>
.insert-drawer {
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

.insert-drawer__header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
}

.insert-drawer__title {
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.insert-drawer__close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  font-size: 16px;
  padding: 4px;
  border-radius: var(--radius-base);
}

.insert-drawer__close:hover {
  background: var(--color-surface-overlay);
  color: var(--color-text-primary);
}

.insert-drawer__list {
  flex: 1;
  overflow-y: auto;
}

.insert-drawer__params {
  flex-shrink: 0;
  border-top: 1px solid var(--color-border-subtle);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 280px;
  overflow-y: auto;
}

.insert-drawer__params-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
}

.insert-drawer__param-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.insert-drawer__param-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  width: 80px;
  flex-shrink: 0;
}

.insert-drawer__param-input {
  flex: 1;
  height: 28px;
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  background: var(--color-surface-elevated);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  outline: none;
}

.insert-drawer__param-input:focus {
  border-color: var(--color-brand);
}

.insert-drawer__submit {
  align-self: flex-end;
  height: 32px;
  padding: 0 var(--space-4);
  background: var(--color-brand);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--radius-base);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.insert-drawer__submit:hover {
  opacity: 0.9;
}
</style>
