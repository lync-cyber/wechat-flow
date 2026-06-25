<script setup lang="ts">
const props = defineProps<{
  themeId: string;
  themeName: string;
  templateId: string;
  templateDescription?: string;
  isActive: boolean;
  onUseTheme: (themeId: string, themeName: string) => void;
  onUseTemplate: (themeId: string, templateId: string) => void;
}>();
</script>

<template>
  <div
    class="template-theme-card"
    :class="{ 'template-theme-card--active': isActive }"
    data-testid="template-theme-card"
  >
    <div class="template-theme-card__thumbnail" data-testid="thumbnail" />

    <div class="template-theme-card__body">
      <div class="template-theme-card__header">
        <span class="template-theme-card__theme-name">{{ themeName }}</span>
        <span
          v-if="isActive"
          class="template-theme-card__badge"
          data-testid="active-badge"
        >正在使用</span>
      </div>

      <p v-if="templateDescription" class="template-theme-card__description">
        {{ templateDescription }}
      </p>

      <div class="template-theme-card__actions">
        <button
          type="button"
          class="template-theme-card__btn template-theme-card__btn--primary"
          :data-testid="`btn-use-theme-${themeId}`"
          @click="onUseTheme(themeId, themeName)"
        >使用此主题</button>

        <button
          type="button"
          class="template-theme-card__btn template-theme-card__btn--secondary"
          :data-testid="`btn-use-template-${themeId}-${templateId}`"
          @click="onUseTemplate(themeId, templateId)"
        >使用此模板</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.template-theme-card {
  width: 280px;
  border-radius: var(--radius-base, 8px);
  border: 1px solid var(--color-border-subtle);
  background: var(--color-surface);
  overflow: hidden;
  transition: box-shadow 0.15s;
}

.template-theme-card:hover {
  border-color: var(--color-border);
  box-shadow: var(--shadow-sm);
}

.template-theme-card--active {
  border: 2px solid var(--color-brand);
  background: var(--color-brand-subtle, #f0f7ff);
}

.template-theme-card__thumbnail {
  height: 160px;
  background: var(--color-surface-sunken, #f5f5f5);
  border-radius: var(--radius-sm, 4px) var(--radius-sm, 4px) 0 0;
}

.template-theme-card__body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.template-theme-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.template-theme-card__theme-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.template-theme-card__badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--color-brand-subtle, #e8f0fe);
  color: var(--color-brand);
  white-space: nowrap;
}

.template-theme-card__description {
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.template-theme-card__actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.template-theme-card__btn {
  width: 100%;
  height: 36px;
  border-radius: var(--radius-sm, 4px);
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.template-theme-card__btn--primary {
  background: var(--color-brand);
  color: #fff;
}

.template-theme-card__btn--primary:hover {
  opacity: 0.9;
}

.template-theme-card__btn--secondary {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.template-theme-card__btn--secondary:hover {
  background: var(--color-surface-overlay);
}
</style>
