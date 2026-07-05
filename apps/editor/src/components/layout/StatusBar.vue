<script setup lang="ts">
import type { DiagnosticReport } from "@wechat-flow/contracts";
import { computed, onMounted, onUnmounted, ref } from "vue";

const props = defineProps<{
  metrics: { chineseChars: number; totalChars: number; readMinutes: number };
  diagnostics: DiagnosticReport;
  isDiagnosticsExpanded: boolean;
}>();

const emit = defineEmits<{
  "toggle-diagnostics": [];
}>();

const KEYWORD_RULE_ID = "keyword-lint";
const READABILITY_RULE_PREFIX = "readability-";

// 兼容性摘要不计入违规词/可读性诊断 —— 两者各自单列一段，避免重复计数
const compatDiagnostics = computed(() =>
  props.diagnostics.diagnostics.filter(
    (d) => d.ruleId !== KEYWORD_RULE_ID && !d.ruleId?.startsWith(READABILITY_RULE_PREFIX)
  )
);

const errorCount = computed(
  () => compatDiagnostics.value.filter((d) => d.severity === "error").length
);

const warnCount = computed(
  () => compatDiagnostics.value.filter((d) => d.severity === "warning").length
);

const compatColor = computed<"error" | "warning" | "muted">(() => {
  if (errorCount.value > 0) return "error";
  if (warnCount.value > 0) return "warning";
  return "muted";
});

const statusState = computed<"idle" | "warn" | "error">(() => {
  if (errorCount.value > 0) return "error";
  if (warnCount.value > 0) return "warn";
  return "idle";
});

const compatText = computed(() => {
  if (errorCount.value > 0) return `严重 ${errorCount.value} 项`;
  if (warnCount.value > 0) return `提醒 ${warnCount.value} 项`;
  return "无风险";
});

const tooltipText = computed(() => {
  const items = compatDiagnostics.value.filter(
    (d) => d.severity === "error" || d.severity === "warning"
  );
  if (items.length === 0) return "无风险";
  return items.map((d) => d.message).join("；");
});

const keywordDiagnostics = computed(() =>
  props.diagnostics.diagnostics.filter((d) => d.ruleId === KEYWORD_RULE_ID)
);

const violationCount = computed(() => keywordDiagnostics.value.length);

const violationColor = computed<"error" | "warning" | "muted">(() => {
  if (violationCount.value === 0) return "muted";
  if (keywordDiagnostics.value.some((d) => d.severity === "error")) return "error";
  return "warning";
});

const violationTooltip = computed(() => `违规词 ${violationCount.value}`);

const readabilityIssues = computed(() =>
  props.diagnostics.diagnostics.filter(
    (d) =>
      d.ruleId?.startsWith(READABILITY_RULE_PREFIX) &&
      (d.severity === "error" || d.severity === "warning")
  )
);

const readabilityColor = computed<"error" | "warning" | "safe">(() => {
  if (readabilityIssues.value.some((d) => d.severity === "error")) return "error";
  if (readabilityIssues.value.length > 0) return "warning";
  return "safe";
});

const readabilityText = computed(() =>
  readabilityIssues.value.length === 0
    ? "可读性 良好"
    : `可读性 ${readabilityIssues.value.length} 项`
);

const readabilityTooltip = computed(() =>
  readabilityIssues.value.length === 0
    ? "可读性良好"
    : readabilityIssues.value.map((d) => d.message).join("；")
);

const nightRiskCount = computed(() => props.diagnostics.nightRiskIssues.length);

const nightRiskColor = computed<"error" | "muted">(() =>
  nightRiskCount.value > 0 ? "error" : "muted"
);

const isTablet = ref(window.innerWidth < 768);

function onResize() {
  isTablet.value = window.innerWidth < 768;
}

onMounted(() => {
  window.addEventListener("resize", onResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});

function onToggleDiagnostics(): void {
  emit("toggle-diagnostics");
}
</script>

<template>
  <footer
    class="status-bar"
    :class="`status-bar--${statusState}`"
    data-testid="status-bar-root"
  >
    <span class="status-bar__item" data-testid="word-count">
      {{ metrics.chineseChars }} 字 / {{ metrics.totalChars }} 字符
    </span>
    <span class="status-bar__item" data-testid="read-time">
      {{ metrics.readMinutes }} 分钟
    </span>
    <button
      v-if="!isTablet"
      type="button"
      class="status-bar__item status-bar__compat"
      :class="`status-bar__compat--${compatColor}`"
      :data-color="compatColor"
      data-testid="compat-summary"
      @click="onToggleDiagnostics"
    >
      {{ compatText }}
    </button>
    <button
      v-else
      type="button"
      class="status-bar__item status-bar__compat status-bar__compat-icon"
      :class="`status-bar__compat--${compatColor}`"
      :data-color="compatColor"
      :data-state="statusState"
      :title="tooltipText"
      data-testid="compat-icon"
      @click="onToggleDiagnostics"
    >
      ⓘ
    </button>

    <span
      class="status-bar__item status-bar__metric"
      :class="`status-bar__metric--${readabilityColor}`"
      :data-color="readabilityColor"
      :title="readabilityTooltip"
      data-testid="readability-summary"
    >
      {{ readabilityText }}
    </span>

    <span
      v-if="!isTablet"
      class="status-bar__item status-bar__metric"
      :class="`status-bar__metric--${violationColor}`"
      :data-color="violationColor"
      data-testid="violation-count"
    >
      违规词 {{ violationCount }}
    </span>
    <span
      v-else
      class="status-bar__item status-bar__metric status-bar__metric-icon"
      :class="`status-bar__metric--${violationColor}`"
      :data-color="violationColor"
      :title="violationTooltip"
      data-testid="violation-icon"
    >
      ⓘ
    </span>

    <span
      class="status-bar__item status-bar__metric"
      :class="`status-bar__metric--${nightRiskColor}`"
      :data-color="nightRiskColor"
      data-testid="night-risk-count"
    >
      夜间风险 {{ nightRiskCount }} 项
    </span>
  </footer>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  height: 32px;
  width: 100%;
  background: var(--color-surface-elevated);
  border-top: 1px solid var(--color-border-subtle);
  padding: 0 var(--space-3, 12px);
  gap: var(--space-4, 16px);
  box-sizing: border-box;
  flex-shrink: 0;
}

.status-bar__item {
  position: relative;
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-muted);
  white-space: nowrap;
}

/* 竖分隔线 —— 居中于每两段间的 gap */
.status-bar__item + .status-bar__item::before {
  content: "";
  position: absolute;
  left: calc(var(--space-4, 16px) / -2);
  top: 50%;
  transform: translateY(-50%);
  width: 1px;
  height: 14px;
  background: var(--color-border, #e5e7eb);
}

.status-bar__compat,
.status-bar__metric {
  background: none;
  border: none;
  padding: 0;
  font-size: var(--font-size-xs, 12px);
}

.status-bar__compat {
  cursor: pointer;
}

.status-bar__compat--muted,
.status-bar__metric--muted {
  color: var(--color-text-muted);
}

.status-bar__metric--safe {
  color: var(--color-diag-safe);
}

.status-bar__compat--error,
.status-bar__metric--error {
  color: var(--color-error);
}

.status-bar__compat--warning,
.status-bar__metric--warning {
  color: var(--color-warning);
}
</style>
