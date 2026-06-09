<script setup lang="ts">
import { computed } from "vue";
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
  }>(),
  {
    viewport: "375",
    nightMode: "off",
    isLoading: false,
    syncState: "idle",
    onViewportChange: undefined,
  }
);

// CSP in the sandboxed document head — defense-in-depth alongside sandbox=""
const CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src https: data:;";

// srcdoc supplies isolated content under sandbox="": parent access to contentDocument
// is blocked by the (no allow-same-origin) sandbox, so write() is unusable; srcdoc is the
// only zero-JS way to drive content from the host page.
const srcdoc = computed(
  () =>
    `<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="${CSP}"></head><body>${props.htmlContent}</body></html>`
);

const iframeContainerStyle = computed(() => {
  if (props.viewport === "auto") return { width: "100%" };
  return { width: `${props.viewport}px` };
});

function handleViewportClick(v: "375" | "768" | "auto"): void {
  props.onViewportChange?.(v);
}
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
      <div
        class="preview-pane__iframe-container"
        :style="iframeContainerStyle"
        data-testid="iframe-container"
      >
        <!-- sandbox="" = strictest sandbox (no scripts/forms/same-origin); srcdoc supplies isolated content -->
        <iframe
          sandbox=""
          :srcdoc="srcdoc"
          class="preview-pane__iframe"
          title="微信预览"
          data-testid="preview-iframe"
        />
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
</style>
