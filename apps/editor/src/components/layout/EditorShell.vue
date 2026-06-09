<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useSplitterWidth } from "../../composables/use-splitter-width";
import { useEditorStore } from "../../stores/editor.ts";
import PreviewPane from "../editor/PreviewPane.vue";
import SourcePane from "../editor/SourcePane.vue";
import ResizableSplitter from "./ResizableSplitter.vue";
import TopBar from "./TopBar.vue";

const editorStore = useEditorStore();

const LEFT_PANEL_MIN = 160;
const LEFT_PANEL_MAX = 320;
const LEFT_PANEL_DEFAULT = 200;
const RIGHT_PANEL_MIN = 280;
const RIGHT_PANEL_MAX = 480;
const RIGHT_PANEL_DEFAULT = 320;
const TABLET_BREAKPOINT = 1280;

const isFocusMode = ref(false);
const isTablet = ref(window.innerWidth < TABLET_BREAKPOINT);
const isDrawerOpen = ref(false);
const previewViewport = ref<"375" | "768" | "auto">("375");

const leftPanel = useSplitterWidth("left", LEFT_PANEL_DEFAULT, LEFT_PANEL_MIN, LEFT_PANEL_MAX);
const rightPanel = useSplitterWidth("right", RIGHT_PANEL_DEFAULT, RIGHT_PANEL_MIN, RIGHT_PANEL_MAX);

function onResize(): void {
  isTablet.value = window.innerWidth < TABLET_BREAKPOINT;
  if (isTablet.value) {
    isDrawerOpen.value = false;
  }
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === "F11") {
    e.preventDefault();
    isFocusMode.value = !isFocusMode.value;
  }
}

function openDrawer(): void {
  isDrawerOpen.value = true;
}

function closeDrawer(): void {
  isDrawerOpen.value = false;
}

onMounted(() => {
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", onResize);
  leftPanel.init();
  rightPanel.init();
  editorStore.loadDraft();
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("resize", onResize);
});
</script>

<template>
  <div class="editor-shell" :class="{ 'editor-shell--focus': isFocusMode }" data-testid="editor-shell">
    <!-- TopBar -->
    <!-- cataforge: wiring-placeholder — onUndo/onRedo/onCopy 接线延后至对应功能任务 -->
    <TopBar
      doc-title="Untitled"
      theme-name="默认主题"
      theme-accent-color="#2D5A4E"
      sync-state="idle"
      :is-focus-mode="isFocusMode"
      :has-unsaved-changes="false"
      :can-undo="false"
      :can-redo="false"
      :on-undo="() => {}"
      :on-redo="() => {}"
      :on-copy="() => {}"
    />

    <!-- Main layout -->
    <div class="editor-shell__body">
      <!-- Drawer overlay (tablet mode) -->
      <div
        v-if="isTablet && isDrawerOpen"
        class="editor-shell__overlay"
        data-testid="drawer-overlay"
        @click="closeDrawer"
      />

      <!-- Left panel / Drawer -->
      <aside
        v-if="(!isTablet && !isFocusMode) || (isTablet && isDrawerOpen)"
        class="editor-shell__left"
        :class="{ 'editor-shell__left--drawer': isTablet }"
        data-testid="left-panel"
        :style="!isTablet ? { width: leftPanel.width.value + 'px' } : undefined"
      >
        <!-- C-006 placeholder -->
      </aside>

      <!-- Left splitter (desktop only, not focus mode) -->
      <ResizableSplitter
        v-if="!isTablet && !isFocusMode"
        direction="vertical"
        :min-left="LEFT_PANEL_MIN"
        :max-left="LEFT_PANEL_MAX"
        :default-left="leftPanel.width.value"
        :on-resize="(w) => leftPanel.onResize(w)"
        data-testid="left-splitter"
      />

      <!-- Center panel -->
      <main
        class="editor-shell__center"
        data-testid="center-panel"
      >
        <SourcePane :model-value="editorStore.content" :on-value-change="(v) => editorStore.setContent(v)" />
      </main>

      <!-- Right splitter (desktop only, not focus mode) -->
      <ResizableSplitter
        v-if="!isTablet && !isFocusMode"
        direction="vertical"
        :min-left="RIGHT_PANEL_MIN"
        :max-left="RIGHT_PANEL_MAX"
        :default-left="rightPanel.width.value"
        :invert="true"
        :on-resize="(w) => rightPanel.onResize(w)"
        data-testid="right-splitter"
      />

      <!-- Right panel -->
      <aside
        v-if="!isFocusMode"
        class="editor-shell__right"
        data-testid="right-panel"
        :style="!isTablet ? { width: rightPanel.width.value + 'px' } : undefined"
      >
        <PreviewPane
          :html-content="editorStore.previewHtml"
          :viewport="previewViewport"
          :on-viewport-change="(v) => (previewViewport = v as '375' | '768' | 'auto')"
          sync-state="idle"
        />
      </aside>
    </div>

    <!-- Status bar placeholder -->
    <footer class="editor-shell__statusbar" data-testid="status-bar" />
  </div>

  <!-- Tablet: hamburger button in TopBar is handled below -->
  <!-- We inject a menu button when in tablet mode -->
  <Teleport to="body">
    <button
      v-if="isTablet && !isFocusMode"
      class="editor-shell__hamburger"
      data-testid="hamburger-btn"
      type="button"
      aria-label="open navigation"
      @click="openDrawer"
    >
      ☰
    </button>
  </Teleport>
</template>

<style scoped>
.editor-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  font-family: var(--font-sans);
  background: var(--color-surface);
}

.editor-shell__body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.editor-shell__left {
  background: var(--color-surface-elevated);
  flex-shrink: 0;
  overflow: hidden;
}

.editor-shell__left--drawer {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 280px;
  z-index: var(--z-modal);
  box-shadow: 2px 0 8px rgba(28, 25, 23, 0.15);
  animation: drawer-slide-in var(--duration-base) var(--ease-standard);
}

@keyframes drawer-slide-in {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

.editor-shell__overlay {
  position: absolute;
  inset: 0;
  background: rgba(28, 25, 23, 0.3);
  z-index: calc(var(--z-modal) - 1);
}

.editor-shell__center {
  flex: 1;
  min-width: 360px;
  background: var(--color-surface);
  overflow: hidden;
}

.editor-shell__right {
  background: var(--color-surface-preview);
  flex-shrink: 0;
  overflow: hidden;
}

.editor-shell__statusbar {
  height: 32px;
  background: var(--color-surface-elevated);
  border-top: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
}

.editor-shell__hamburger {
  position: fixed;
  top: 8px;
  left: 8px;
  z-index: calc(var(--z-toolbar) + 1);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-base);
  padding: 4px 8px;
  cursor: pointer;
  font-size: 16px;
}
</style>
