<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  syncState: "idle" | "connecting" | "syncing" | "synced" | "offline" | "error" | "conflict";
}>();

const dotClasses = computed(() => {
  const s = props.syncState;
  return [
    `sync-state-indicator--${s}`,
    s === "syncing" ? "sync-state-indicator--pulse-fast" : null,
    s === "connecting" ? "sync-state-indicator--pulse-slow" : null,
  ].filter(Boolean);
});
</script>

<template>
  <div class="sync-state-indicator" data-testid="sync-state-indicator">
    <span :class="['sync-state-indicator__dot', ...dotClasses]" data-testid="sync-dot" />
    <span
      v-if="syncState === 'conflict'"
      class="sync-state-indicator__tag"
      data-testid="sync-conflict-tag"
    >冲突</span>
  </div>
</template>

<style scoped>
.sync-state-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  pointer-events: none;
  user-select: none;
}

.sync-state-indicator__dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sync-state-indicator--idle { background-color: var(--color-text-muted); }
.sync-state-indicator--connecting { background-color: var(--color-brand-muted); }
.sync-state-indicator--syncing { background-color: var(--color-brand); }
.sync-state-indicator--synced { background-color: var(--color-success); }
.sync-state-indicator--offline { background-color: var(--color-warning); }
.sync-state-indicator--error { background-color: var(--color-error); }
.sync-state-indicator--conflict { background-color: var(--color-error); }

.sync-state-indicator--pulse-fast {
  animation: sync-pulse 0.8s ease-in-out infinite;
}

.sync-state-indicator--pulse-slow {
  animation: sync-pulse 1.5s ease-in-out infinite;
}

@keyframes sync-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.sync-state-indicator__tag {
  font-size: var(--font-size-xs);
  color: var(--color-error);
  background: var(--color-error-subtle);
  border-radius: var(--radius-full, 9999px);
  padding: 1px 6px;
  line-height: 1.4;
}
</style>
