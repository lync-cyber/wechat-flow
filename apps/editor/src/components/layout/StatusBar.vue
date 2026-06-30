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

const errorCount = computed(
  () => props.diagnostics.diagnostics.filter((d) => d.severity === "error").length
);

const warnCount = computed(
  () => props.diagnostics.diagnostics.filter((d) => d.severity === "warning").length
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
  const items = props.diagnostics.diagnostics.filter(
    (d) => d.severity === "error" || d.severity === "warning"
  );
  if (items.length === 0) return "无风险";
  return items.map((d) => d.message).join("；");
});

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
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.status-bar__compat {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: var(--font-size-xs, 12px);
}

.status-bar__compat--muted {
  color: var(--color-text-muted);
}

.status-bar__compat--error {
  color: var(--color-error);
}

.status-bar__compat--warning {
  color: var(--color-warning);
}
</style>
