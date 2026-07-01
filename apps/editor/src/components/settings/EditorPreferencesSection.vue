<script setup lang="ts">
import { onMounted } from "vue";
import { usePreferencesStore } from "../../stores/preferences-store.ts";

const store = usePreferencesStore();

onMounted(() => {
  store.init();
});

function onInputAssistChange(e: Event): void {
  const checked = (e.target as HTMLInputElement).checked;
  store.updatePreferences({ inputAssist: checked });
}

function onFontSizeChange(e: Event): void {
  const value = Number((e.target as HTMLSelectElement).value);
  store.updatePreferences({ fontSize: value });
}

function onLineHeightChange(e: Event): void {
  const value = Number((e.target as HTMLSelectElement).value);
  store.updatePreferences({ lineHeight: value });
}
</script>

<template>
  <div class="editor-prefs">
    <div class="editor-prefs-group">
      <h3 class="editor-prefs-group__title">编辑器偏好</h3>

      <label class="editor-prefs-field editor-prefs-field--row">
        <input
          type="checkbox"
          data-testid="pref-input-assist"
          class="editor-prefs-checkbox"
          :checked="store.inputAssist"
          @change="onInputAssistChange"
        />
        <span class="editor-prefs-field__label">输入辅助（中英加空格 / 智能引号 / 破折号）</span>
      </label>

      <label class="editor-prefs-field">
        <span class="editor-prefs-field__label">字体大小</span>
        <select
          data-testid="pref-font-size"
          class="editor-prefs-select"
          :value="store.fontSize"
          @change="onFontSizeChange"
        >
          <option value="14">14px</option>
          <option value="16">16px</option>
          <option value="18">18px</option>
        </select>
      </label>

      <label class="editor-prefs-field">
        <span class="editor-prefs-field__label">行高</span>
        <select
          data-testid="pref-line-height"
          class="editor-prefs-select"
          :value="store.lineHeight"
          @change="onLineHeightChange"
        >
          <option value="1.5">紧凑</option>
          <option value="1.75">标准</option>
          <option value="2">宽松</option>
        </select>
      </label>
    </div>
  </div>
</template>

<style scoped>
.editor-prefs {
  display: flex;
  flex-direction: column;
  gap: var(--space-6, 24px);
}

.editor-prefs-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
  padding: var(--space-4, 16px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 6px);
  background: var(--color-surface-elevated);
}

.editor-prefs-group__title {
  margin: 0;
  font-size: var(--font-size-base, 15px);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-text-primary);
}

.editor-prefs-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1, 4px);
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-secondary);
}

.editor-prefs-field--row {
  flex-direction: row;
  align-items: center;
  gap: var(--space-2, 8px);
}

.editor-prefs-field__label {
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-secondary);
}

.editor-prefs-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.editor-prefs-select {
  height: 32px;
  padding: 0 var(--space-3, 12px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base, 4px);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm, 13px);
  width: 100%;
}

.editor-prefs-select:focus {
  outline: none;
  border-color: var(--color-brand);
}
</style>
