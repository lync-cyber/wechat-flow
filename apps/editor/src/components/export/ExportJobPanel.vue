<script setup lang="ts">
import { computed } from "vue";
import JobProgressBar from "../common/JobProgressBar.vue";

interface JobLike {
  status: { value: "queued" | "running" | "completed" | "failed" };
  percent: { value: number };
  result: { value: unknown };
  error: { value: { code: string; message: string } | undefined };
}

const props = defineProps<{
  isOpen: boolean;
  job: JobLike;
}>();

const emit = defineEmits<{
  close: [];
}>();

const canClose = computed(
  () => props.job.status.value === "completed" || props.job.status.value === "failed"
);

const downloadUrl = computed(() => {
  const result = props.job.result.value as { url?: string } | undefined;
  return result?.url;
});
</script>

<template>
  <div v-if="isOpen" class="export-job-panel" data-testid="export-job-panel">
    <div class="export-job-panel__header">
      <span class="export-job-panel__title">导出长图</span>
      <button
        v-if="canClose"
        type="button"
        class="export-job-panel__close"
        data-testid="export-job-panel-close"
        aria-label="关闭"
        @click="emit('close')"
      >✕</button>
    </div>
    <JobProgressBar
      :status="job.status.value"
      :percent="job.percent.value"
      :error-msg="job.error.value?.message"
      :download-url="downloadUrl"
    />
  </div>
</template>

<style scoped>
.export-job-panel {
  position: fixed;
  bottom: 48px;
  right: var(--space-4);
  width: 320px;
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  padding: var(--space-3);
  z-index: var(--z-toolbar);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.export-job-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.export-job-panel__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.export-job-panel__close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  font-size: 14px;
  padding: 2px;
  border-radius: var(--radius-base);
}

.export-job-panel__close:hover {
  background: var(--color-surface-overlay);
  color: var(--color-text-primary);
}
</style>
