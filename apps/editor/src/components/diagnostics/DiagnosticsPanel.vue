<script setup lang="ts">
import type { Diagnostic, DiagnosticReport } from "@wechat-flow/contracts";
import { computed, nextTick, ref, watch } from "vue";
import DiagnosticsItem from "./DiagnosticsItem.vue";

type AnchorGroup = "compat" | "readability" | "keyword" | "night-risk";

const props = withDefaults(
  defineProps<{
    diagnostics: DiagnosticReport;
    isRunning?: boolean;
    isExpanded?: boolean;
    anchorGroup?: AnchorGroup;
  }>(),
  {
    isRunning: false,
    isExpanded: false,
    anchorGroup: undefined,
  }
);

const emit = defineEmits<{
  toggle: [];
  "item-click": [nodeSelector: string];
  "show-diff": [nodeSelector: string];
}>();

const KEYWORD_RULE_ID = "keyword-lint";
const READABILITY_RULE_PREFIX = "readability-";

const compatDiagnostics = computed(() =>
  props.diagnostics.diagnostics.filter(
    (d: Diagnostic) =>
      d.ruleId !== KEYWORD_RULE_ID && !d.ruleId?.startsWith(READABILITY_RULE_PREFIX)
  )
);

const readabilityDiagnostics = computed(() =>
  props.diagnostics.diagnostics.filter((d: Diagnostic) =>
    d.ruleId?.startsWith(READABILITY_RULE_PREFIX)
  )
);

const keywordDiagnostics = computed(() =>
  props.diagnostics.diagnostics.filter((d: Diagnostic) => d.ruleId === KEYWORD_RULE_ID)
);

const nightRiskIssues = computed(() => props.diagnostics.nightRiskIssues);

const errorCount = computed(
  () => props.diagnostics.diagnostics.filter((d: Diagnostic) => d.severity === "error").length
);

const hasNightRisk = computed(() => nightRiskIssues.value.length > 0);

watch(
  errorCount,
  (count) => {
    if (count > 0 && !props.isExpanded) {
      emit("toggle");
    }
  },
  { immediate: true }
);

const panelRoot = ref<HTMLElement | null>(null);

watch(
  () => [props.anchorGroup, props.isExpanded] as const,
  async ([group, expanded]) => {
    if (!group || !expanded) return;
    await nextTick();
    const target = panelRoot.value?.querySelector(`[data-testid="group-header-${group}"]`);
    target?.scrollIntoView({ block: "nearest" });
  },
  { immediate: true }
);

function handleToggle(): void {
  emit("toggle");
}

function handleShowDiff(nodeSelector: string): void {
  emit("show-diff", nodeSelector);
}

function handleItemClick(nodeSelector: string): void {
  emit("item-click", nodeSelector);
}
</script>

<template>
  <div
    ref="panelRoot"
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
        <div v-if="compatDiagnostics.length > 0" class="diagnostics-panel__group">
          <div class="diagnostics-panel__group-header" data-testid="group-header-compat">
            兼容性 {{ compatDiagnostics.length }} 项
          </div>
          <DiagnosticsItem
            v-for="(diag, i) in compatDiagnostics"
            :key="`compat-${i}`"
            :diagnostic="diag"
            @show-diff="handleShowDiff"
            @item-click="handleItemClick"
          />
        </div>

        <div v-if="readabilityDiagnostics.length > 0" class="diagnostics-panel__group">
          <div class="diagnostics-panel__group-header" data-testid="group-header-readability">
            可读性 {{ readabilityDiagnostics.length }} 项
          </div>
          <DiagnosticsItem
            v-for="(diag, i) in readabilityDiagnostics"
            :key="`readability-${i}`"
            :diagnostic="diag"
            @show-diff="handleShowDiff"
            @item-click="handleItemClick"
          />
        </div>

        <div v-if="keywordDiagnostics.length > 0" class="diagnostics-panel__group">
          <div class="diagnostics-panel__group-header" data-testid="group-header-keyword">
            违规词 {{ keywordDiagnostics.length }} 项
          </div>
          <DiagnosticsItem
            v-for="(diag, i) in keywordDiagnostics"
            :key="`keyword-${i}`"
            :diagnostic="diag"
            @show-diff="handleShowDiff"
            @item-click="handleItemClick"
          />
        </div>

        <div v-if="nightRiskIssues.length > 0" class="diagnostics-panel__group">
          <div class="diagnostics-panel__group-header" data-testid="group-header-night-risk">
            夜间风险 {{ nightRiskIssues.length }} 项
          </div>
          <div
            v-for="(risk, i) in nightRiskIssues"
            :key="`night-risk-${i}`"
            class="diagnostics-panel__night-risk-item"
            data-testid="night-risk-item"
          >
            <span class="diagnostics-panel__night-risk-icon" aria-hidden="true">🌙</span>
            <span class="diagnostics-panel__night-risk-message">
              {{ risk.nodeSelector }} 对比度 {{ risk.contrastRatio.toFixed(1) }}（{{ risk.suggestion }}）
            </span>
            <button
              type="button"
              class="diagnostics-panel__night-risk-link"
              data-testid="night-risk-view-btn"
              @click="handleItemClick(risk.nodeSelector)"
            >查看</button>
          </div>
        </div>
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

.diagnostics-panel__group-header {
  height: 24px;
  display: flex;
  align-items: center;
  padding: 0 var(--space-3, 12px);
  font-size: var(--font-size-xs, 11px);
  color: var(--color-text-muted);
}

.diagnostics-panel__night-risk-item {
  display: flex;
  align-items: center;
  height: 36px;
  gap: var(--space-2, 8px);
  padding: 0 var(--space-3, 12px);
}

.diagnostics-panel__night-risk-icon {
  flex-shrink: 0;
}

.diagnostics-panel__night-risk-message {
  flex: 1;
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.diagnostics-panel__night-risk-link {
  border: none;
  background: none;
  color: var(--color-text-link);
  font-size: var(--font-size-sm, 13px);
  cursor: pointer;
  padding: 0 var(--space-1, 4px);
  flex-shrink: 0;
}

.diagnostics-panel__night-risk-link:hover {
  color: var(--color-text-link-hover);
  text-decoration: underline;
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
