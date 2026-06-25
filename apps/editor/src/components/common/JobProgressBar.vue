<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  status: "queued" | "running" | "completed" | "failed";
  percent?: number;
  errorMsg?: string;
  downloadUrl?: string;
  onRetry?: () => void;
}>();

const fillStyle = computed(() => ({
  width: props.status === "queued" ? "0%" : `${props.percent ?? 0}%`,
  transition: "width 300ms ease",
}));

const fillClass = computed(() => {
  if (props.status === "completed") return "job-progress-bar__fill--completed";
  if (props.status === "failed") return "job-progress-bar__fill--failed";
  return "job-progress-bar__fill--running";
});

const labelText = computed(() => {
  if (props.status === "queued") return "等待中…";
  if (props.status === "running") return `正在导出 ${props.percent ?? 0}%`;
  if (props.status === "completed") return "导出成功";
  return `导出失败：${props.errorMsg ?? ""}`;
});
</script>

<template>
  <div class="job-progress-bar" data-testid="job-progress-bar">
    <div class="job-progress-bar__track" data-testid="progress-track">
      <div
        :class="['job-progress-bar__fill', fillClass]"
        :style="fillStyle"
        data-testid="progress-fill"
      />
    </div>
    <div class="job-progress-bar__label" data-testid="progress-label">
      <span>{{ labelText }}</span>
      <a
        v-if="status === 'completed' && downloadUrl"
        :href="downloadUrl"
        class="job-progress-bar__download"
        data-testid="download-link"
        target="_blank"
        rel="noopener noreferrer"
      >下载</a>
      <button
        v-if="status === 'failed' && onRetry"
        class="job-progress-bar__retry"
        data-testid="retry-btn"
        type="button"
        @click="onRetry"
      >重试</button>
    </div>
  </div>
</template>

<style scoped>
.job-progress-bar {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.job-progress-bar__track {
  height: 8px;
  background: var(--color-brand-muted);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.job-progress-bar__fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 300ms ease;
}

.job-progress-bar__fill--running {
  background: var(--color-brand);
}

.job-progress-bar__fill--completed {
  background: var(--color-success);
}

.job-progress-bar__fill--failed {
  background: var(--color-error);
}

.job-progress-bar__label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 14px;
  color: var(--color-text-secondary);
}

.job-progress-bar__download {
  color: var(--color-text-link);
  text-decoration: underline;
  cursor: pointer;
}

.job-progress-bar__retry {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 1px var(--space-2);
  font-size: 13px;
  cursor: pointer;
  color: var(--color-text-secondary);
}
</style>
