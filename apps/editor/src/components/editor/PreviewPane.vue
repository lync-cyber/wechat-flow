<script setup lang="ts">
import { computed, ref } from "vue";
import SyncStateIndicator from "./SyncStateIndicator.vue";

const props = withDefaults(
  defineProps<{
    htmlContent: string;
    viewport?: "375" | "768" | "auto";
    nightMode?: "off" | "risk-preview";
    isLoading?: boolean;
    error?: string;
    syncState?: "idle" | "connecting" | "syncing" | "synced" | "offline" | "error" | "conflict";
    onViewportChange?: (v: string) => void;
    onRetry?: () => void;
  }>(),
  {
    viewport: "375",
    nightMode: "off",
    isLoading: false,
    syncState: "idle",
    onViewportChange: undefined,
    onRetry: undefined,
  }
);

// CSP in the sandboxed document head — defense-in-depth alongside sandbox="allow-same-origin"
const CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src https: data:;";

// .cm-highlighted: transient highlight applied by parent via contentDocument.classList
// Color uses warm-base token palette for visual consistency with editor shell
const HIGHLIGHT_CSS =
  ".cm-highlighted { background-color: rgba(45, 90, 78, 0.15); outline: 2px solid rgba(45, 90, 78, 0.4); border-radius: 2px; }";

// srcdoc supplies isolated content; sandbox="allow-same-origin" enables parent
// contentDocument access for bidirectional highlight without enabling script execution.
const srcdoc = computed(
  () =>
    `<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="${CSP}"><style>${HIGHLIGHT_CSS}</style></head><body>${props.htmlContent}</body></html>`
);

const iframeContainerStyle = computed(() => {
  if (props.viewport === "auto") return { width: "100%" };
  return { width: `${props.viewport}px` };
});

function handleViewportClick(v: "375" | "768" | "auto"): void {
  props.onViewportChange?.(v);
}

function handleRetry(): void {
  props.onRetry?.();
}

const iframeEl = ref<HTMLIFrameElement | null>(null);

defineExpose({ iframeEl });
</script>

<template>
  <div class="preview-pane" data-testid="preview-pane">
    <!-- Viewport toolbar -->
    <div class="preview-pane__toolbar" data-testid="viewport-toolbar">
      <button
        type="button"
        :class="[
          'preview-pane__viewport-btn',
          viewport === '375' ? 'preview-pane__viewport-btn--active' : '',
        ]"
        data-testid="viewport-btn-375"
        @click="handleViewportClick('375')"
      >手机</button>
      <button
        type="button"
        :class="[
          'preview-pane__viewport-btn',
          viewport === '768' ? 'preview-pane__viewport-btn--active' : '',
        ]"
        data-testid="viewport-btn-768"
        @click="handleViewportClick('768')"
      >平板</button>
      <button
        type="button"
        :class="[
          'preview-pane__viewport-btn',
          viewport === 'auto' ? 'preview-pane__viewport-btn--active' : '',
        ]"
        data-testid="viewport-btn-auto"
        @click="handleViewportClick('auto')"
      >自适应</button>
    </div>

    <!-- iframe wrapper -->
    <div class="preview-pane__scroll">
      <!-- error state replaces the preview area -->
      <div v-if="error" class="preview-pane__error" data-testid="preview-error">
        <div class="preview-pane__error-icon" aria-hidden="true">!</div>
        <p class="preview-pane__error-msg">{{ error }}</p>
        <button
          type="button"
          class="preview-pane__retry-btn"
          data-testid="preview-retry-btn"
          @click="handleRetry"
        >重试</button>
      </div>

      <div
        v-else
        class="preview-pane__iframe-container"
        :style="iframeContainerStyle"
        data-testid="iframe-container"
      >
        <!-- sandbox="allow-same-origin": enables parent contentDocument access for bidirectional
             highlight (AC-001/AC-002); scripts remain blocked by CSP default-src 'none' -->
        <iframe
          ref="iframeEl"
          sandbox="allow-same-origin"
          :srcdoc="srcdoc"
          class="preview-pane__iframe"
          title="微信预览"
          data-testid="preview-iframe"
        />
        <!-- loading overlay covers the iframe area while rendering -->
        <div v-if="isLoading" class="preview-pane__loading" data-testid="preview-loading">
          <div class="preview-pane__spinner" aria-hidden="true" />
          <span class="preview-pane__loading-text">渲染中…</span>
        </div>
      </div>
    </div>

    <!-- Sync state indicator (bottom-right) -->
    <div class="preview-pane__sync">
      <SyncStateIndicator :sync-state="syncState ?? 'idle'" />
    </div>
  </div>
</template>

<style scoped>
.preview-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-surface-preview);
  position: relative;
  overflow: hidden;
}

.preview-pane__toolbar {
  display: flex;
  align-items: center;
  height: 36px;
  flex-shrink: 0;
  padding: 0 var(--space-2, 8px);
  gap: var(--space-1, 4px);
  border-bottom: 1px solid var(--color-border-subtle);
  background: var(--color-surface-elevated);
}

.preview-pane__viewport-btn {
  padding: 2px 10px;
  border: none;
  background: transparent;
  border-radius: var(--radius-base, 4px);
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-secondary);
  cursor: pointer;
  line-height: 1.6;
}

.preview-pane__viewport-btn--active {
  background: var(--color-brand-subtle);
  color: var(--color-brand);
  font-weight: var(--font-weight-medium, 500);
}

.preview-pane__scroll {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: var(--space-4, 16px);
}

.preview-pane__iframe-container {
  max-width: 100%;
  height: 100%;
  flex-shrink: 0;
  position: relative;
}

.preview-pane__iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.preview-pane__sync {
  position: absolute;
  bottom: var(--space-2, 8px);
  right: var(--space-2, 8px);
}

.preview-pane__loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3, 12px);
  background: var(--color-surface-preview);
}

.preview-pane__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border-subtle);
  border-top-color: var(--color-brand-muted);
  border-radius: var(--radius-full, 9999px);
  animation: preview-spin 0.8s linear infinite;
}

@keyframes preview-spin {
  to {
    transform: rotate(360deg);
  }
}

.preview-pane__loading-text {
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-muted);
}

.preview-pane__error {
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4, 16px);
  padding: var(--space-6, 24px);
  text-align: center;
}

.preview-pane__error-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: var(--font-weight-bold, 700);
  line-height: 1;
  color: var(--color-error);
}

.preview-pane__error-msg {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--font-size-sm, 14px);
  color: var(--color-text-secondary);
}

.preview-pane__retry-btn {
  padding: var(--space-2, 8px) var(--space-5, 20px);
  border: none;
  border-radius: var(--radius-base, 4px);
  background: var(--color-brand);
  color: var(--color-text-inverse);
  font-size: var(--font-size-sm, 13px);
  font-weight: var(--font-weight-medium, 500);
  cursor: pointer;
}

.preview-pane__retry-btn:hover {
  background: var(--color-brand-hover);
}
</style>
