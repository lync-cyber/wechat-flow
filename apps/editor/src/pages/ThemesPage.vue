<script setup lang="ts">
import { describeTemplate, listThemeTemplates, listThemes } from "@wechat-flow/core";
import { computed } from "vue";
import TemplateThemeCard from "../components/themes/TemplateThemeCard.vue";
import { useToast } from "../composables/use-toast.ts";
import { useEditorStore } from "../stores/editor.ts";

const editorStore = useEditorStore();
const { pushToast } = useToast();

interface CardEntry {
  themeId: string;
  themeName: string;
  templateId: string;
  templateDescription?: string;
}

const cards = computed<CardEntry[]>(() => {
  const themes = listThemes();
  const result: CardEntry[] = [];
  for (const theme of themes) {
    const templates = listThemeTemplates(theme.id);
    if (templates.length === 0) {
      result.push({ themeId: theme.id, themeName: theme.name, templateId: "" });
    } else {
      for (const tpl of templates) {
        result.push({
          themeId: theme.id,
          themeName: theme.name,
          templateId: tpl.templateId,
          templateDescription: tpl.description,
        });
      }
    }
  }
  return result;
});

function handleUseTheme(themeId: string, themeName: string): void {
  editorStore.currentTheme = themeId;
  pushToast({ type: "success", message: `已切换到 ${themeName} 主题` });
}

function handleUseTemplate(themeId: string, templateId: string): void {
  try {
    const { markdown } = describeTemplate(themeId, templateId);
    if (markdown !== undefined) {
      editorStore.setContent(markdown);
    }
  } catch {
    // template not found — no-op
  }
}
</script>

<template>
  <main class="themes-page">
    <header class="themes-page__header">
      <h1 class="themes-page__title">主题模板市场</h1>
      <p class="themes-page__subtitle">选择主题风格和写作模板，快速开始创作</p>
    </header>

    <div class="themes-page__grid">
      <TemplateThemeCard
        v-for="card in cards"
        :key="`${card.themeId}-${card.templateId}`"
        :data-testid="`template-theme-card-${card.themeId}-${card.templateId}`"
        :theme-id="card.themeId"
        :theme-name="card.themeName"
        :template-id="card.templateId"
        :template-description="card.templateDescription"
        :is-active="editorStore.currentTheme === card.themeId"
        :on-use-theme="handleUseTheme"
        :on-use-template="handleUseTemplate"
      />
    </div>
  </main>
</template>

<style scoped>
.themes-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.themes-page__header {
  margin-bottom: 24px;
}

.themes-page__title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 8px;
}

.themes-page__subtitle {
  font-size: 14px;
  color: var(--color-text-muted);
  margin: 0;
}

.themes-page__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-6, 24px);
}

@media (max-width: 1279px) {
  .themes-page__grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4, 16px);
  }
}

@media (max-width: 767px) {
  .themes-page__grid {
    grid-template-columns: 1fr;
    gap: var(--space-3, 12px);
  }
}
</style>
