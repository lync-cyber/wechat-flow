<script setup lang="ts">
import type { DiffEntry } from "@wechat-flow/core";

const props = defineProps<{
  isOpen: boolean;
  diff: DiffEntry[];
  perRule: Record<string, number>;
  totalChanges: number;
  onConfirm: () => void;
  onCancel: () => void;
}>();
</script>

<template>
  <div
    v-if="isOpen"
    class="zh-typo-modal__backdrop"
    data-testid="zh-typo-preview-modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="zh-typo-modal-title"
  >
    <div class="zh-typo-modal__panel">
      <div class="zh-typo-modal__header">
        <h2 id="zh-typo-modal-title" class="zh-typo-modal__title">中文排版修订预览</h2>
        <span class="zh-typo-modal__summary">共修订 {{ totalChanges }} 处</span>
      </div>

      <div v-if="Object.keys(perRule).length > 0" class="zh-typo-modal__rules">
        <div
          v-for="(count, ruleId) in perRule"
          :key="ruleId"
          class="zh-typo-modal__rule-row"
          :data-testid="`zh-typo-rule-${ruleId}`"
        >
          <span class="zh-typo-modal__rule-id">{{ ruleId }}</span>
          <span class="zh-typo-modal__rule-count">{{ count }}</span>
        </div>
      </div>

      <div class="zh-typo-modal__diff">
        <div
          v-for="(entry, idx) in diff"
          :key="idx"
          class="zh-typo-modal__diff-row"
          :data-testid="`zh-typo-diff-${idx}`"
        >
          <span class="zh-typo-modal__diff-original">{{ entry.original }}</span>
          <span class="zh-typo-modal__diff-arrow">→</span>
          <span class="zh-typo-modal__diff-revised">{{ entry.revised }}</span>
        </div>
        <div v-if="diff.length === 0" class="zh-typo-modal__no-changes">
          无排版问题
        </div>
      </div>

      <div class="zh-typo-modal__footer">
        <button
          type="button"
          class="zh-typo-modal__btn zh-typo-modal__btn--cancel"
          data-testid="zh-typo-cancel"
          @click="props.onCancel()"
        >
          取消
        </button>
        <button
          type="button"
          class="zh-typo-modal__btn zh-typo-modal__btn--confirm"
          data-testid="zh-typo-confirm"
          @click="props.onConfirm()"
        >
          确认修订
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.zh-typo-modal__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal, 1000);
}

.zh-typo-modal__panel {
  background: var(--color-surface, #fff);
  border-radius: var(--radius-md, 8px);
  box-shadow: var(--shadow-lg, 0 8px 32px rgba(0, 0, 0, 0.18));
  width: 560px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.zh-typo-modal__header {
  display: flex;
  align-items: baseline;
  gap: var(--space-3, 12px);
  padding: var(--space-4, 16px) var(--space-4, 16px) var(--space-2, 8px);
  border-bottom: 1px solid var(--color-border-subtle, #e5e7eb);
  flex-shrink: 0;
}

.zh-typo-modal__title {
  font-size: var(--font-size-base, 14px);
  font-weight: 600;
  color: var(--color-text-primary, #111);
  margin: 0;
}

.zh-typo-modal__summary {
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-muted, #6b7280);
}

.zh-typo-modal__rules {
  padding: var(--space-3, 12px) var(--space-4, 16px) 0;
  flex-shrink: 0;
}

.zh-typo-modal__rule-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm, 13px);
  padding: var(--space-1, 4px) 0;
  color: var(--color-text-secondary, #374151);
}

.zh-typo-modal__rule-id {
  font-family: var(--font-mono, monospace);
  color: var(--color-text-muted, #6b7280);
}

.zh-typo-modal__rule-count {
  font-weight: 500;
}

.zh-typo-modal__diff {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3, 12px) var(--space-4, 16px);
}

.zh-typo-modal__diff-row {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  font-size: var(--font-size-sm, 13px);
  padding: var(--space-1, 4px) 0;
  border-bottom: 1px solid var(--color-border-subtle, #e5e7eb);
}

.zh-typo-modal__diff-original {
  flex: 1;
  color: var(--color-error, #dc2626);
  text-decoration: line-through;
  font-family: var(--font-mono, monospace);
  word-break: break-all;
}

.zh-typo-modal__diff-arrow {
  color: var(--color-text-muted, #9ca3af);
  flex-shrink: 0;
}

.zh-typo-modal__diff-revised {
  flex: 1;
  color: var(--color-success, #16a34a);
  font-family: var(--font-mono, monospace);
  word-break: break-all;
}

.zh-typo-modal__no-changes {
  text-align: center;
  color: var(--color-text-muted, #9ca3af);
  font-size: var(--font-size-sm, 13px);
  padding: var(--space-4, 16px) 0;
}

.zh-typo-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2, 8px);
  padding: var(--space-3, 12px) var(--space-4, 16px);
  border-top: 1px solid var(--color-border-subtle, #e5e7eb);
  flex-shrink: 0;
}

.zh-typo-modal__btn {
  height: 32px;
  padding: 0 var(--space-3, 12px);
  border-radius: var(--radius-base, 4px);
  font-size: var(--font-size-sm, 13px);
  cursor: pointer;
  border: 1px solid var(--color-border, #d1d5db);
  background: var(--color-surface, #fff);
  color: var(--color-text-primary, #111);
}

.zh-typo-modal__btn--confirm {
  background: var(--color-brand, #2D5A4E);
  color: #fff;
  border-color: var(--color-brand, #2D5A4E);
}

.zh-typo-modal__btn--confirm:hover {
  opacity: 0.9;
}
</style>
