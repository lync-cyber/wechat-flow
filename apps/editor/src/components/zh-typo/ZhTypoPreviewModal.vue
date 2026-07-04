<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  isOpen: boolean;
  original: string;
  revised: string;
  perRule: Record<string, number>;
  totalChanges: number;
  onConfirm: () => void;
  onCancel: () => void;
}>();

const RULE_LABELS: Record<string, string> = {
  "zh-en-space": "中英文空格",
  "fullwidth-punctuation": "全半角标点",
  "smart-quotes": "智能引号",
  "ellipsis-dash": "省略号/破折号",
};

function toLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const originalLines = computed(() => toLines(props.original));
const revisedLines = computed(() => toLines(props.revised));

const revisedRows = computed(() => {
  const rowCount = Math.max(originalLines.value.length, revisedLines.value.length);
  return Array.from({ length: rowCount }, (_, i) => {
    const text = revisedLines.value[i] ?? "";
    const orig = originalLines.value[i] ?? "";
    return { text, changed: text !== orig };
  });
});

const categories = computed(() =>
  Object.entries(props.perRule)
    .filter(([, count]) => count > 0)
    .map(([ruleId, count]) => ({
      ruleId,
      label: RULE_LABELS[ruleId] ?? ruleId,
      count,
    }))
);
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
        <span v-if="totalChanges > 0" class="zh-typo-modal__summary">共修订 {{ totalChanges }} 处</span>
      </div>

      <div
        v-if="totalChanges === 0"
        class="zh-typo-modal__empty"
        data-testid="zh-typo-empty"
      >
        <span class="zh-typo-modal__empty-check" aria-hidden="true">✓</span>
        <p class="zh-typo-modal__empty-text">文档排版规范，无需修订</p>
      </div>

      <div v-else class="zh-typo-modal__body">
        <section class="zh-typo-modal__col" data-testid="zh-typo-col-original">
          <h3 class="zh-typo-modal__col-title">原文</h3>
          <div class="zh-typo-modal__col-body">
            <p
              v-for="(line, i) in originalLines"
              :key="i"
              class="zh-typo-modal__line"
            >{{ line }}</p>
          </div>
        </section>

        <section
          class="zh-typo-modal__col zh-typo-modal__col--revised"
          data-testid="zh-typo-col-revised"
        >
          <h3 class="zh-typo-modal__col-title">修订后</h3>
          <div class="zh-typo-modal__col-body">
            <p
              v-for="(row, i) in revisedRows"
              :key="i"
              class="zh-typo-modal__line"
              :class="{ 'zh-typo-modal__line--changed': row.changed }"
              :data-changed="row.changed ? 'true' : 'false'"
            >{{ row.text }}</p>
          </div>
        </section>

        <aside class="zh-typo-modal__sidebar" data-testid="zh-typo-sidebar">
          <div
            v-for="cat in categories"
            :key="cat.ruleId"
            class="zh-typo-modal__cat"
            :data-testid="`zh-typo-cat-${cat.ruleId}`"
          >
            <span class="zh-typo-modal__cat-label">{{ cat.label }}</span>
            <span class="zh-typo-modal__cat-count"><strong>{{ cat.count }}</strong> 处</span>
          </div>
        </aside>
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
          应用修订
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
  width: 760px;
  max-width: 92vw;
  max-height: 82vh;
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

.zh-typo-modal__body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr 168px;
  gap: var(--space-3, 12px);
  padding: var(--space-4, 16px);
  overflow: hidden;
}

.zh-typo-modal__col {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--color-border-subtle, #e5e7eb);
  border-radius: var(--radius-base, 4px);
  overflow: hidden;
}

.zh-typo-modal__col--revised {
  background: var(--color-brand-subtle, #eef4f1);
}

.zh-typo-modal__col-title {
  margin: 0;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  font-size: var(--font-size-xs, 12px);
  font-weight: 500;
  color: var(--color-text-muted, #6b7280);
  border-bottom: 1px solid var(--color-border-subtle, #e5e7eb);
  flex-shrink: 0;
}

.zh-typo-modal__col--revised .zh-typo-modal__col-title {
  color: var(--color-brand, #2d5a4e);
}

.zh-typo-modal__col-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3, 12px);
}

.zh-typo-modal__line {
  margin: 0 0 var(--space-2, 8px);
  font-size: var(--font-size-sm, 13px);
  line-height: 1.7;
  color: var(--color-text-secondary, #374151);
  word-break: break-word;
}

.zh-typo-modal__line:last-child {
  margin-bottom: 0;
}

.zh-typo-modal__line--changed {
  padding-left: var(--space-2, 8px);
  border-left: 3px solid var(--color-brand, #2d5a4e);
  color: var(--color-text-primary, #111);
}

.zh-typo-modal__sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
  overflow-y: auto;
  padding-right: var(--space-1, 4px);
}

.zh-typo-modal__cat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.zh-typo-modal__cat-label {
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-secondary, #374151);
}

.zh-typo-modal__cat-count {
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-muted, #6b7280);
}

.zh-typo-modal__cat-count strong {
  color: var(--color-brand, #2d5a4e);
  font-weight: 600;
}

.zh-typo-modal__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3, 12px);
  padding: var(--space-6, 24px);
}

.zh-typo-modal__empty-check {
  font-size: 32px;
  line-height: 1;
  color: var(--color-success, #16a34a);
}

.zh-typo-modal__empty-text {
  margin: 0;
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-muted, #6b7280);
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
