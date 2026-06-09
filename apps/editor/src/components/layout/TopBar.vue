<script setup lang="ts">
const props = defineProps<{
  docTitle: string;
  themeName: string;
  templateName?: string;
  themeAccentColor: string;
  syncState: "idle" | "connecting" | "syncing" | "synced" | "offline" | "error" | "conflict";
  isFocusMode: boolean;
  hasUnsavedChanges: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
}>();
</script>

<template>
  <header
    class="top-bar"
    :class="{ 'top-bar--focus': props.isFocusMode }"
    data-testid="top-bar"
  >
    <!-- Logo zone -->
    <div class="top-bar__logo" data-testid="top-bar-logo">
      <span class="top-bar__logo-dot" />
      <span class="top-bar__logo-text">wechat-flow</span>
    </div>

    <!-- Doc name zone -->
    <div class="top-bar__doc-name" data-testid="top-bar-doc-name">
      <span>{{ props.docTitle }}</span>
      <span
        v-if="props.hasUnsavedChanges"
        class="top-bar__unsaved-dot"
        data-testid="top-bar-unsaved-dot"
        aria-label="unsaved changes"
      >·</span>
    </div>

    <!-- Theme indicator -->
    <div class="top-bar__theme" data-testid="top-bar-theme">
      <span
        class="top-bar__theme-swatch"
        :style="{ background: props.themeAccentColor }"
      />
      <span>{{ props.themeName }}</span>
      <span v-if="props.templateName"> · {{ props.templateName }}</span>
    </div>

    <!-- Toolbar button group -->
    <div
      v-if="!props.isFocusMode"
      class="top-bar__toolbar"
      data-testid="top-bar-toolbar"
    >
      <button type="button" aria-label="insert">+</button>
      <button type="button" aria-label="viewport">□</button>
      <button type="button" class="top-bar__copy-btn" @click="props.onCopy">
        复制到公众号
      </button>
      <button type="button" aria-label="more">...</button>
    </div>

    <!-- User menu placeholder -->
    <div class="top-bar__user" data-testid="top-bar-user" />
  </header>
</template>

<style scoped>
.top-bar {
  display: flex;
  align-items: center;
  height: 48px;
  background: var(--color-surface-elevated);
  border-bottom: 1px solid var(--color-border-subtle);
  padding: 0 var(--space-4);
  gap: var(--space-4);
  position: sticky;
  top: 0;
  z-index: var(--z-toolbar);
  box-sizing: border-box;
}

.top-bar--focus {
  border-bottom: none;
}

.top-bar__logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 200px;
  flex-shrink: 0;
}

.top-bar__logo-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
}

.top-bar__logo-text {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.top-bar__doc-name {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 2px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--color-text-primary);
}

.top-bar__unsaved-dot {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.top-bar__theme {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.top-bar__theme-swatch {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-base);
  display: inline-block;
  flex-shrink: 0;
}

.top-bar__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
}

.top-bar__copy-btn {
  background: var(--color-brand);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--radius-base);
  padding: 0 var(--space-3);
  height: 32px;
  cursor: pointer;
  font-weight: var(--font-weight-medium);
}

.top-bar__user {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-surface-overlay);
  flex-shrink: 0;
}
</style>
