<script setup lang="ts">
defineProps<{
  visible: boolean;
  dismissed: boolean;
}>();

const emit = defineEmits<{
  dismiss: [];
}>();

function handleDismiss(): void {
  emit("dismiss");
}
</script>

<template>
  <div
    v-if="visible && !dismissed"
    class="night-banner"
    data-testid="night-banner"
    role="alert"
  >
    <span class="night-banner__text">
      公众号夜间模式为客户端反转滤镜，不读取本文样式。此预览仅以深色底暴露纯黑/纯白对比盲区（风险预警），不做像素级模拟，不会自动修复。
    </span>
    <button
      type="button"
      class="night-banner__close"
      data-testid="night-banner-close"
      aria-label="关闭夜间模式提示"
      @click="handleDismiss"
    >×</button>
  </div>
</template>

<style scoped>
.night-banner {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2, 8px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
  background: rgba(45, 30, 0, 0.85);
  color: var(--color-warning, #f5a623);
  font-size: var(--font-size-sm, 13px);
  line-height: 1.5;
  border-bottom: 1px solid rgba(245, 166, 35, 0.3);
}

.night-banner__text {
  flex: 1;
}

.night-banner__close {
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: inherit;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0 var(--space-1, 4px);
  opacity: 0.7;
}

.night-banner__close:hover {
  opacity: 1;
}
</style>
