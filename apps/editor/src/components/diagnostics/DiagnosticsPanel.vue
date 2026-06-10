<script setup lang="ts">
import type { Diagnostic, DiagnosticReport } from "@wechat-flow/contracts";
import { computed, watch } from "vue";
import DiagnosticsItem from "./DiagnosticsItem.vue";

const props = withDefaults(
  defineProps<{
    diagnostics: DiagnosticReport;
    isRunning?: boolean;
    isExpanded?: boolean;
  }>(),
  {
    isRunning: false,
    isExpanded: false,
  }
);

const emit = defineEmits<{
  toggle: [];
  "item-click": [nodeSelector: string];
  "show-diff": [nodeSelector: string];
}>();

const errorCount = computed(
  () => props.diagnostics.diagnostics.filter((d: Diagnostic) => d.severity === "error").length
);

const warnCount = computed(
  () => props.diagnostics.diagnostics.filter((d: Diagnostic) => d.severity === "warning").length
);

const hasIssues = computed(() => props.diagnostics.diagnostics.length > 0);

const hasNightRisk = computed(() => props.diagnostics.nightRiskIssues.length > 0);

watch(
  errorCount,
  (count) => {
    if (count > 0 && !props.isExpanded) {
      emit("toggle");
    }
  },
  { immediate: true }
);

function handleToggle(): void {
  emit("toggle");
}

function handleShowDiff(nodeSelector: string): void {
  emit("show-diff", nodeSelector);
}
</script>

<template>
  <div
    class="diagnostics-panel"
    :class="{ 'diagnostics-panel--night-risk-alert': hasNightRisk }"
    data-testid="diagnostics-panel"
  >
    <!-- Title row (32px) -->
    <div
      class="diagnostics-panel__header"
      data-testid="diagnostics-header"
      @click="handleToggle"
    >
      <span
        v-if="hasNightRisk"
        class="diagnostics-panel__night-risk-marker"
        data-testid="night-risk-marker"
        aria-hidden="true"
      >🌙</span>
      <span class="diagnostics-panel__title">兼容性报告</span>
      <span v-if="!hasIssues" class="diagnostics-panel__no-issues" data-testid="no-issues-badge">
        无风险
      </span>
      <template v-if="hasIssues">
        <span
          v-if="errorCount > 0"
          class="diagnostics-panel__count diagnostics-panel__count--error"
          data-testid="error-count"
        >严重 {{ errorCount }} 项</span>
        <span
          v-if="warnCount > 0"
          class="diagnostics-panel__count diagnostics-panel__count--warn"
          data-testid="warn-count"
        >提醒 {{ warnCount }} 项</span>
        <span
          v-if="hasNightRisk"
          class="diagnostics-panel__count diagnostics-panel__count--night"
          data-testid="night-risk-count"
        >夜间风险 {{ diagnostics.nightRiskIssues.length }} 项</span>
      </template>
      <button
        type="button"
        class="diagnostics-panel__toggle-btn"
        data-testid="toggle-btn"
        :aria-expanded="isExpanded"
        @click.stop="handleToggle"
      >{{ isExpanded ? "收起" : "展开" }}</button>
    </div>

    <!-- Expanded list -->
    <div
      v-if="isExpanded"
      class="diagnostics-panel__list"
      data-testid="diagnostics-list"
    >
      <div v-if="isRunning" class="diagnostics-panel__running" data-testid="running-indicator">
        <div class="diagnostics-panel__spinner" />
        <span>检测中…</span>
      </div>
      <template v-else>
        <DiagnosticsItem
          v-for="(diag, i) in diagnostics.diagnostics"
          :key="i"
          :diagnostic="diag"
          @show-diff="handleShowDiff"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.diagnostics-panel {
  background: var(--color-surface-elevated);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.diagnostics-panel--night-risk-alert {
  border-top: 2px solid var(--color-diag-error);
}

.diagnostics-panel__header {
  height: 32px;
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  padding: 0 var(--space-3, 12px);
  cursor: pointer;
  flex-shrink: 0;
  user-select: none;
}

.diagnostics-panel__night-risk-marker {
  font-size: var(--font-size-sm, 13px);
}

.diagnostics-panel__title {
  font-size: var(--font-size-sm, 13px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-text-primary);
  flex: 1;
}

.diagnostics-panel__no-issues {
  font-size: var(--font-size-sm, 13px);
  color: var(--color-diag-safe);
}

.diagnostics-panel__count {
  font-size: var(--font-size-sm, 13px);
}

.diagnostics-panel__count--error {
  color: var(--color-error);
}

.diagnostics-panel__count--warn {
  color: var(--color-warning);
}

.diagnostics-panel__count--night {
  color: var(--color-error);
}

.diagnostics-panel__toggle-btn {
  border: none;
  background: none;
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0 var(--space-1, 4px);
  flex-shrink: 0;
}

.diagnostics-panel__list {
  overflow-y: auto;
  max-height: 168px; /* 200px - 32px header */
}

.diagnostics-panel__running {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  padding: var(--space-3, 12px);
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-muted);
}

.diagnostics-panel__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border-subtle);
  border-top-color: var(--color-brand-muted);
  border-radius: var(--radius-full, 9999px);
  animation: diag-spin 0.8s linear infinite;
}

@keyframes diag-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
