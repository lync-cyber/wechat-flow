<script setup lang="ts">
import { ref } from "vue";
import ApiKeyConfig from "../components/settings/ApiKeyConfig.vue";
import ImageHostConfig from "../components/settings/ImageHostConfig.vue";

type NavSection = "editor" | "theme" | "sync" | "imagehost" | "apikey" | "about";

interface NavItem {
  id: NavSection;
  label: string;
}

const navItems: NavItem[] = [
  { id: "editor", label: "编辑器" },
  { id: "theme", label: "主题与品牌" },
  { id: "sync", label: "同步与协作" },
  { id: "imagehost", label: "图床配置" },
  { id: "apikey", label: "API 密钥" },
  { id: "about", label: "关于" },
];

const activeSection = ref<NavSection>("editor");

function setActive(id: NavSection): void {
  activeSection.value = id;
}
</script>

<template>
  <div class="settings-page">
    <nav class="settings-nav">
      <button
        v-for="item in navItems"
        :key="item.id"
        type="button"
        class="settings-nav__item"
        :class="{ 'settings-nav__item--active': activeSection === item.id }"
        :data-testid="`settings-nav-${item.id}`"
        @click="setActive(item.id)"
      >
        {{ item.label }}
      </button>
    </nav>

    <main class="settings-content">
      <section v-if="activeSection === 'editor'" data-testid="settings-content-editor">
        <h2 class="settings-content__title">编辑器</h2>
        <!-- [ASSUMPTION]: 待 T-040 实现编辑器配置组件 -->
        <p class="settings-content__placeholder">编辑器偏好设置</p>
      </section>

      <section v-else-if="activeSection === 'theme'" data-testid="settings-content-theme">
        <h2 class="settings-content__title">主题与品牌</h2>
        <!-- [ASSUMPTION]: 待 T-041 实现主题市场页组件 -->
        <p class="settings-content__placeholder">主题与品牌配置</p>
      </section>

      <section v-else-if="activeSection === 'sync'" data-testid="settings-content-sync">
        <h2 class="settings-content__title">同步与协作</h2>
        <!-- [ASSUMPTION]: 同步与协作功能待后续 Sprint 规划 -->
        <p class="settings-content__placeholder">同步与协作配置</p>
      </section>

      <section
        v-else-if="activeSection === 'imagehost'"
        data-testid="settings-content-imagehost"
      >
        <h2 class="settings-content__title">图床配置</h2>
        <ImageHostConfig />
      </section>

      <section v-else-if="activeSection === 'apikey'" data-testid="settings-content-apikey">
        <h2 class="settings-content__title">API 密钥</h2>
        <ApiKeyConfig />
      </section>

      <section v-else-if="activeSection === 'about'" data-testid="settings-content-about">
        <h2 class="settings-content__title">关于</h2>
        <!-- [ASSUMPTION]: 版本信息展示待 deploy-spec 确认产物版本注入方式 -->
        <p class="settings-content__placeholder">版本信息</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  height: 100%;
  background: var(--color-surface);
}

.settings-nav {
  width: 200px;
  min-width: 200px;
  padding: var(--space-4, 16px) 0;
  border-right: 1px solid var(--color-border);
  background: var(--color-surface-elevated);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.settings-nav__item {
  display: block;
  width: 100%;
  padding: var(--space-2, 8px) var(--space-4, 16px);
  text-align: left;
  background: none;
  border: none;
  border-radius: var(--radius-base, 4px);
  cursor: pointer;
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-secondary);
  transition: background var(--duration-fast, 150ms) var(--ease-standard);
}

.settings-nav__item:hover {
  background: var(--color-surface-overlay);
  color: var(--color-text-primary);
}

.settings-nav__item--active {
  background: var(--color-brand-subtle);
  color: var(--color-brand);
  font-weight: var(--font-weight-medium, 500);
}

.settings-content {
  flex: 1;
  padding: var(--space-6, 24px);
  max-width: 640px;
  overflow-y: auto;
}

.settings-content__title {
  margin: 0 0 var(--space-4, 16px);
  font-size: var(--font-size-lg, 18px);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-text-primary);
}

.settings-content__placeholder {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm, 13px);
}
</style>
