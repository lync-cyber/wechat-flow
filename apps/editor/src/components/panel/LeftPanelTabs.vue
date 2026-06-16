<script setup lang="ts">
import { listBlocks } from "@wechat-flow/core";
import { listThemes } from "@wechat-flow/core";
import { computed, ref } from "vue";
import BlockLibItem from "./BlockLibItem.vue";
import ThemeCard from "./ThemeCard.vue";

type TabId = "theme" | "components" | "docs";

const props = withDefaults(
  defineProps<{
    defaultTab?: TabId;
    onTabChange?: (tab: TabId) => void;
    onThemeSelect?: (themeId: string) => void;
    onInsertBlock?: (directive: string) => void;
  }>(),
  {
    defaultTab: "theme",
  }
);

const activeTab = ref<TabId>(props.defaultTab);
const selectedThemeId = ref<string | null>(null);

const themes = computed(() => listThemes());
const blocks = computed(() => listBlocks());

function switchTab(tab: TabId): void {
  activeTab.value = tab;
  props.onTabChange?.(tab);
}

function selectTheme(id: string): void {
  selectedThemeId.value = id;
  props.onThemeSelect?.(id);
}

function insertBlock(block: ReturnType<typeof listBlocks>[number]): void {
  props.onInsertBlock?.(`:::${block.id}\n内容\n:::`);
}
</script>

<template>
  <div class="left-panel-tabs">
    <!-- Tab header row -->
    <div class="left-panel-tabs__header" role="tablist">
      <button
        v-for="tab in (['theme', 'components', 'docs'] as TabId[])"
        :key="tab"
        type="button"
        role="tab"
        class="left-panel-tabs__tab"
        :class="{ 'left-panel-tabs__tab--active': activeTab === tab }"
        :data-testid="`tab-${tab}`"
        :aria-selected="activeTab === tab"
        @click="switchTab(tab)"
      >{{ tab === 'theme' ? '主题' : tab === 'components' ? '组件' : '文档' }}</button>
    </div>

    <!-- Tab content -->
    <div class="left-panel-tabs__content" role="tabpanel">
      <!-- Theme tab -->
      <template v-if="activeTab === 'theme'">
        <div class="left-panel-tabs__theme-list">
          <ThemeCard
            v-for="theme in themes"
            :key="theme.id"
            :data-testid="`theme-card-${theme.id}`"
            :theme="{ id: theme.id, name: theme.name, tokens: {} }"
            :is-selected="selectedThemeId === theme.id"
            :on-select="selectTheme"
          />
        </div>
        <div class="left-panel-tabs__theme-links">
          <a
            href="#"
            class="left-panel-tabs__theme-link"
            data-testid="link-custom-color"
          >自定义配色</a>
          <a
            href="#"
            class="left-panel-tabs__theme-link"
            data-testid="link-palette-derive"
          >调色板派生</a>
        </div>
      </template>

      <!-- Components tab -->
      <template v-else-if="activeTab === 'components'">
        <div class="left-panel-tabs__block-list">
          <BlockLibItem
            v-for="block in blocks"
            :key="block.id"
            :block="block"
            :on-insert="insertBlock"
          />
        </div>
      </template>

      <!-- Docs tab -->
      <template v-else-if="activeTab === 'docs'">
        <div class="left-panel-tabs__docs-placeholder" data-testid="docs-content">
          文档
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.left-panel-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-surface-elevated);
  overflow: hidden;
}

.left-panel-tabs__header {
  display: flex;
  flex-shrink: 0;
  height: 40px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.left-panel-tabs__tab {
  flex: 1;
  height: 100%;
  border: none;
  background: none;
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  padding: 0;
}

.left-panel-tabs__tab:hover {
  background: var(--color-surface-overlay);
}

.left-panel-tabs__tab--active {
  background: var(--color-surface-overlay);
  color: var(--color-brand);
  border-bottom: 2px solid var(--color-brand);
}

.left-panel-tabs__content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.left-panel-tabs__theme-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  flex: 1;
}

.left-panel-tabs__theme-links {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  border-top: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
}

.left-panel-tabs__theme-link {
  font-size: var(--font-size-sm, 13px);
  color: var(--color-brand);
  text-decoration: none;
}

.left-panel-tabs__theme-link:hover {
  text-decoration: underline;
}

.left-panel-tabs__block-list {
  display: flex;
  flex-direction: column;
}

.left-panel-tabs__docs-placeholder {
  padding: 12px;
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-muted);
}
</style>
