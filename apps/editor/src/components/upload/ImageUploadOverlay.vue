<script setup lang="ts">
import JobProgressBar from "../common/JobProgressBar.vue";

const props = withDefaults(
  defineProps<{
    state: "idle" | "dragging" | "uploading" | "success" | "error";
    progress?: number;
    errorMsg?: string;
    previewUrl?: string;
    onRetry: () => void;
    onCancel: () => void;
  }>(),
  {
    progress: 0,
    errorMsg: undefined,
    previewUrl: undefined,
  }
);
</script>

<template>
  <div
    class="image-upload-overlay"
    :class="{
      'image-upload-overlay--dragging': state === 'dragging',
      'image-upload-overlay--uploading': state === 'uploading',
      'image-upload-overlay--success': state === 'success',
      'image-upload-overlay--error': state === 'error',
    }"
    data-testid="image-upload-overlay"
  >
    <!-- idle -->
    <div v-if="state === 'idle'" class="image-upload-overlay__idle" data-testid="overlay-idle">
      <span class="image-upload-overlay__icon" aria-hidden="true">🖼</span>
      <p class="image-upload-overlay__hint">拖入图片或粘贴</p>
    </div>

    <!-- dragging -->
    <div
      v-else-if="state === 'dragging'"
      class="image-upload-overlay__dragging"
      data-testid="overlay-dragging"
    >
      <p class="image-upload-overlay__drag-hint">松开以上传</p>
    </div>

    <!-- uploading -->
    <div
      v-else-if="state === 'uploading'"
      class="image-upload-overlay__uploading"
      data-testid="overlay-uploading"
    >
      <div class="image-upload-overlay__thumb-placeholder" aria-hidden="true" />
      <JobProgressBar status="running" :percent="progress" />
      <p class="image-upload-overlay__progress-text">{{ progress }}%</p>
    </div>

    <!-- success -->
    <div
      v-else-if="state === 'success'"
      class="image-upload-overlay__success"
      data-testid="overlay-success"
    >
      <span class="image-upload-overlay__icon image-upload-overlay__icon--success" aria-hidden="true">✓</span>
      <p>上传成功</p>
    </div>

    <!-- error -->
    <div
      v-else-if="state === 'error'"
      class="image-upload-overlay__error"
      data-testid="overlay-error"
    >
      <span class="image-upload-overlay__icon image-upload-overlay__icon--error" aria-hidden="true">✕</span>
      <p class="image-upload-overlay__error-msg">{{ errorMsg }}</p>
      <button
        class="image-upload-overlay__retry-btn"
        data-testid="retry-btn"
        type="button"
        @click="props.onRetry()"
      >重试</button>
      <button
        class="image-upload-overlay__cancel-btn"
        data-testid="cancel-btn"
        type="button"
        @click="props.onCancel()"
      >取消</button>
    </div>
  </div>
</template>

<style scoped>
.image-upload-overlay {
  width: 320px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  z-index: var(--z-dropdown);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.image-upload-overlay__idle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-6);
  width: 100%;
  box-sizing: border-box;
}

.image-upload-overlay__hint {
  font-size: 14px;
  color: var(--color-text-muted);
  margin: 0;
}

.image-upload-overlay--dragging {
  border-color: var(--color-brand);
  background: var(--color-brand-subtle);
}

.image-upload-overlay__dragging {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  width: 100%;
  box-sizing: border-box;
}

.image-upload-overlay__drag-hint {
  color: var(--color-brand);
  font-size: 14px;
  margin: 0;
}

.image-upload-overlay__thumb-placeholder {
  width: 100%;
  height: 80px;
  background: var(--color-surface-overlay);
  border-radius: var(--radius-base);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.image-upload-overlay__progress-text {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}

.image-upload-overlay__icon {
  font-size: 32px;
}

.image-upload-overlay__icon--success {
  color: var(--color-success);
}

.image-upload-overlay__icon--error {
  color: var(--color-error);
}

.image-upload-overlay__error-msg {
  font-size: 12px;
  color: var(--color-error);
  margin: 0;
  text-align: center;
}

.image-upload-overlay__retry-btn {
  background: var(--color-brand);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--radius-base);
  padding: var(--space-2) var(--space-4);
  font-size: 14px;
  cursor: pointer;
}

.image-upload-overlay__cancel-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 14px;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.image-upload-overlay__uploading {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.image-upload-overlay__success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}
</style>
