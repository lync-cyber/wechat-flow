<script setup lang="ts">
import { describeTemplate, describeTheme, listThemeTemplates, listThemes } from "@wechat-flow/core";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import TemplateThemeCard from "../components/themes/TemplateThemeCard.vue";
import { useToast } from "../composables/use-toast.ts";
import { useEditorStore } from "../stores/editor.ts";

const editorStore = useEditorStore();
const { pushToast } = useToast();
const router = useRouter();
const filterQuery = ref("");
const activeChip = ref("all");

const FALLBACK_THEME_ACCENT = "#2D5A4E";

interface CardEntry {
  themeId: string;
  themeName: string;
  templateId: string;
  templateName?: string;
  templateDescription?: string;
  accentColor: string;
  themeTokens?: Record<string, string>;
}

function tokensForTheme(themeId: string): Record<string, string> | undefined {
  return describeTheme(themeId)?.tokens as Record<string, string> | undefined;
}

function accentColorForTheme(themeId: string): string {
  const brand = tokensForTheme(themeId)?.["--color-brand"];
  return typeof brand === "string" ? brand : FALLBACK_THEME_ACCENT;
}

const themeChips = computed(() => listThemes());

const allCards = computed<CardEntry[]>(() => {
  const themes = listThemes();
  const result: CardEntry[] = [];
  for (const theme of themes) {
    const accentColor = accentColorForTheme(theme.id);
    const themeTokens = tokensForTheme(theme.id);
    const templates = listThemeTemplates(theme.id);
    if (templates.length === 0) {
      result.push({
        themeId: theme.id,
        themeName: theme.name,
        templateId: "",
        accentColor,
        themeTokens,
      });
    } else {
      for (const tpl of templates) {
        result.push({
          themeId: theme.id,
          themeName: theme.name,
          templateId: tpl.templateId,
          templateName: tpl.name ?? tpl.templateId,
          templateDescription: tpl.description,
          accentColor,
          themeTokens,
        });
      }
    }
  }
  return result;
});

const chipFilteredCards = computed<CardEntry[]>(() => {
  if (activeChip.value === "all") return allCards.value;
  return allCards.value.filter((card) => card.themeId === activeChip.value);
});

const cards = computed<CardEntry[]>(() => {
  const q = filterQuery.value.trim().toLowerCase();
  if (!q) return chipFilteredCards.value;
  return chipFilteredCards.value.filter((card) => {
    return (
      card.themeName.toLowerCase().includes(q) ||
      (card.templateDescription ?? "").toLowerCase().includes(q) ||
      card.templateId.toLowerCase().includes(q)
    );
  });
});

function selectChip(themeId: string): void {
  activeChip.value = themeId;
}

function handleUseTheme(themeId: string, themeName: string): void {
  editorStore.currentTheme = themeId;
  pushToast({ type: "success", message: `已切换到 ${themeName} 主题` });
}

async function handleUseTemplate(themeId: string, templateId: string): Promise<void> {
  try {
    const { markdown } = describeTemplate(themeId, templateId);
    if (markdown !== undefined) {
      await editorStore.createDoc(markdown);
    }
  } catch {
    // template not found — no-op
  }
}
</script>

<template>
  <main class="themes-page">
    <a
      class="themes-page__back-link"
      href="/"
      data-testid="back-to-editor"
      @click.prevent="router.push('/')"
    >← 返回编辑器</a>

    <header class="themes-page__header">
      <h1 class="themes-page__title">主题模板市场</h1>
      <p class="themes-page__subtitle">选择主题风格和写作模板，快速开始创作</p>
    </header>

    <div class="themes-page__toolbar">
      <div class="themes-page__chips" data-testid="filter-chips">
        <button
          type="button"
          class="themes-page__chip"
          :class="{ 'themes-page__chip--active': activeChip === 'all' }"
          data-testid="filter-chip-all"
          @click="selectChip('all')"
        >全部</button>
        <button
          v-for="theme in themeChips"
          :key="theme.id"
          type="button"
          class="themes-page__chip"
          :class="{ 'themes-page__chip--active': activeChip === theme.id }"
          :data-testid="`filter-chip-${theme.id}`"
          @click="selectChip(theme.id)"
        >{{ theme.name }}</button>
      </div>

      <input
        v-model="filterQuery"
        class="themes-page__filter"
        type="text"
        placeholder="搜索主题或模板..."
        data-testid="filter-input"
      />
    </div>

    <div v-if="cards.length > 0" class="themes-page__grid">
      <TemplateThemeCard
        v-for="card in cards"
        :key="`${card.themeId}-${card.templateId}`"
        :data-testid="`template-theme-card-${card.themeId}-${card.templateId}`"
        :theme-id="card.themeId"
        :theme-name="card.themeName"
        :template-id="card.templateId"
        :template-name="card.templateName"
        :template-description="card.templateDescription"
        :accent-color="card.accentColor"
        :theme-tokens="card.themeTokens"
        :is-active="editorStore.currentTheme === card.themeId"
        :on-use-theme="handleUseTheme"
        :on-use-template="handleUseTemplate"
      />
    </div>

    <div v-else class="themes-page__empty" data-testid="empty-state">
      <p class="themes-page__empty-text">未找到匹配的主题或模板</p>
    </div>
  </main>
</template>

<style scoped>
.themes-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.themes-page__back-link {
  display: inline-block;
  margin-bottom: 16px;
  font-size: 14px;
  color: var(--color-text-muted);
  text-decoration: none;
}

.themes-page__back-link:hover {
  color: var(--color-text);
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

.themes-page__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.themes-page__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.themes-page__chip {
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
  cursor: pointer;
}

.themes-page__chip:hover {
  border-color: var(--color-brand);
}

.themes-page__chip--active {
  border-color: var(--color-brand);
  background: var(--color-brand);
  color: #fff;
}

.themes-page__filter {
  width: 100%;
  max-width: 360px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, 4px);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 14px;
  outline: none;
}

.themes-page__filter:focus {
  border-color: var(--color-brand);
  box-shadow: 0 0 0 2px var(--color-brand-subtle, #e8f0fe);
}

.themes-page__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6, 24px);
}

.themes-page__empty {
  padding: 48px 0;
  text-align: center;
}

.themes-page__empty-text {
  font-size: 14px;
  color: var(--color-text-muted);
  margin: 0;
}

@media (max-width: 1279px) {
  .themes-page__grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4, 16px);
  }
}

@media (max-width: 767px) {
  .themes-page__toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .themes-page__grid {
    grid-template-columns: 1fr;
    gap: var(--space-3, 12px);
  }
}
</style>
