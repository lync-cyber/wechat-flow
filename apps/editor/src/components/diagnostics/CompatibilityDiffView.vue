<script setup lang="ts">
import type { AttrDiffEntry, NodeChangeRecord } from "@wechat-flow/contracts";

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    nodeSelector?: string;
    nodeChangeRecords?: NodeChangeRecord[];
    triggerRule?: string;
  }>(),
  {
    nodeSelector: undefined,
    nodeChangeRecords: () => [],
    triggerRule: undefined,
  }
);

const emit = defineEmits<{
  close: [];
}>();

function handleClose(): void {
  emit("close");
}

function opClass(op: AttrDiffEntry["op"]): string {
  if (op === "add") return "attr-diff--add";
  if (op === "remove") return "attr-diff--remove";
  if (op === "modify") return "attr-diff--modify";
  return "attr-diff--keep";
}

function opPrefix(op: AttrDiffEntry["op"]): string {
  if (op === "add") return "+";
  if (op === "remove") return "-";
  if (op === "modify") return "~";
  return "=";
}
</script>

<template>
  <div
    v-if="isOpen"
    class="compat-diff-view__backdrop"
    data-testid="compat-diff-backdrop"
    @click.self="handleClose"
  >
    <div
      class="compat-diff-view__modal"
      role="dialog"
      aria-modal="true"
      :aria-label="`节点变更对照 — ${nodeSelector ?? ''}`"
      data-testid="compat-diff-modal"
    >
      <div class="compat-diff-view__header" data-testid="compat-diff-header">
        <h2 class="compat-diff-view__title">节点变更对照 — {{ nodeSelector }}</h2>
        <button
          type="button"
          class="compat-diff-view__close-btn"
          data-testid="compat-diff-close-btn"
          @click="handleClose"
        >关闭</button>
      </div>

      <div
        v-if="nodeChangeRecords && nodeChangeRecords.length > 0"
        class="compat-diff-view__records"
        data-testid="change-records"
      >
        <div
          v-for="(record, i) in nodeChangeRecords"
          :key="i"
          class="compat-diff-view__record-row"
          :data-testid="`record-row-${i}`"
        >
          <div class="compat-diff-view__columns">
            <div class="compat-diff-view__col compat-diff-view__col--before" data-testid="before-col">
              <div class="compat-diff-view__col-label">变更前</div>
              <pre class="compat-diff-view__code" data-testid="before-html">{{ record.before }}</pre>
            </div>
            <div class="compat-diff-view__col compat-diff-view__col--after" data-testid="after-col">
              <div class="compat-diff-view__col-label">变更后</div>
              <pre class="compat-diff-view__code" data-testid="after-html">{{ record.after }}</pre>
            </div>
          </div>
          <div v-if="record.attrDiff.length > 0" class="compat-diff-view__attr-diff" data-testid="attr-diff-list">
            <div
              v-for="(entry, j) in record.attrDiff"
              :key="j"
              class="compat-diff-view__attr-entry"
              :class="opClass(entry.op)"
              :data-testid="`attr-diff-${j}`"
            >
              <span class="compat-diff-view__attr-prefix">{{ opPrefix(entry.op) }}</span>
              <span class="compat-diff-view__attr-name">{{ entry.attrName }}</span>
              <span v-if="entry.oldValue != null" class="compat-diff-view__attr-old">{{ entry.oldValue }}</span>
              <span v-if="entry.newValue != null" class="compat-diff-view__attr-new">→ {{ entry.newValue }}</span>
            </div>
          </div>
          <div class="compat-diff-view__trigger-rule" data-testid="trigger-rule">
            命中规则：{{ record.triggerRuleId }}
          </div>
        </div>
      </div>

      <div
        v-else
        class="compat-diff-view__empty"
        data-testid="no-records"
      >
        无变更记录
      </div>

      <div class="compat-diff-view__footer" data-testid="compat-diff-footer">
        <div v-if="triggerRule" class="compat-diff-view__rule-id" data-testid="footer-trigger-rule">
          触发规则：{{ triggerRule }}
        </div>
        <button
          type="button"
          class="compat-diff-view__footer-close"
          data-testid="footer-close-btn"
          @click="handleClose"
        >关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.compat-diff-view__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(28, 25, 23, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal, 300);
}

.compat-diff-view__modal {
  background: var(--color-surface-elevated);
  border-radius: var(--radius-lg, 8px);
  box-shadow: var(--shadow-lg);
  width: 720px;
  max-width: 95vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.compat-diff-view__header {
  display: flex;
  align-items: center;
  padding: var(--space-4, 16px) var(--space-6, 24px);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.compat-diff-view__title {
  flex: 1;
  margin: 0;
  font-size: var(--font-size-md, 16px);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-text-primary);
}

.compat-diff-view__close-btn {
  border: none;
  background: none;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm, 13px);
  cursor: pointer;
  padding: var(--space-1, 4px) var(--space-2, 8px);
}

.compat-diff-view__records {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4, 16px) var(--space-6, 24px);
  display: flex;
  flex-direction: column;
  gap: var(--space-6, 24px);
}

.compat-diff-view__record-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
}

.compat-diff-view__columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4, 16px);
}

.compat-diff-view__col {
  display: flex;
  flex-direction: column;
  gap: var(--space-1, 4px);
}

.compat-diff-view__col--before {
  background: var(--color-surface);
  border-radius: var(--radius-base, 4px);
  padding: var(--space-2, 8px);
}

.compat-diff-view__col--after {
  background: var(--color-success-subtle);
  border-radius: var(--radius-base, 4px);
  padding: var(--space-2, 8px);
}

.compat-diff-view__col-label {
  font-size: var(--font-size-xs, 11px);
  color: var(--color-text-muted);
  text-transform: uppercase;
  font-weight: var(--font-weight-medium, 500);
  letter-spacing: 0.05em;
}

.compat-diff-view__code {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-primary);
  white-space: pre-wrap;
  word-break: break-all;
}

.compat-diff-view__attr-diff {
  display: flex;
  flex-direction: column;
  gap: var(--space-1, 4px);
}

.compat-diff-view__attr-entry {
  display: flex;
  align-items: center;
  gap: var(--space-1, 4px);
  font-size: var(--font-size-sm, 13px);
  font-family: var(--font-mono);
}

.attr-diff--add { color: var(--color-diag-safe); }
.attr-diff--remove { color: var(--color-diag-error); }
.attr-diff--modify { color: var(--color-diag-warn); }
.attr-diff--keep { color: var(--color-text-muted); }

.compat-diff-view__attr-prefix {
  font-weight: var(--font-weight-bold, 700);
  width: 12px;
  flex-shrink: 0;
}

.compat-diff-view__trigger-rule {
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-muted);
  padding-left: var(--space-2, 8px);
}

.compat-diff-view__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm, 13px);
  padding: var(--space-8, 32px);
}

.compat-diff-view__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3, 12px);
  padding: var(--space-4, 16px) var(--space-6, 24px);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.compat-diff-view__rule-id {
  flex: 1;
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-muted);
}

.compat-diff-view__footer-close {
  padding: var(--space-2, 8px) var(--space-5, 20px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base, 4px);
  background: var(--color-surface);
  font-size: var(--font-size-sm, 13px);
  cursor: pointer;
  color: var(--color-text-secondary);
}
</style>
