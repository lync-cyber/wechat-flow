<script setup lang="ts">
import type { DiagnosticReport } from "@wechat-flow/contracts";
import { describeTheme, listThemes, registerTheme } from "@wechat-flow/core";
import { type ComponentPublicInstance, computed, onMounted, onUnmounted, ref } from "vue";
import { useAutoBackup } from "../../composables/use-auto-backup.ts";
import { useBidirectionalHighlight } from "../../composables/use-bidirectional-highlight.ts";
import { useKeywordLint } from "../../composables/use-keyword-lint.ts";
import { useSplitterWidth } from "../../composables/use-splitter-width";
import { useToast } from "../../composables/use-toast.ts";
import { useZhTypo } from "../../composables/use-zh-typo.ts";
import { countWords } from "../../editor/extensions/word-count.ts";
import type { CommandDefinition } from "../../lib/command-registry.ts";
import { buildEditorCommands } from "../../lib/command-registry.ts";
import { useEditorStore } from "../../stores/editor.ts";
import { usePreferencesStore } from "../../stores/preferences-store.ts";
import { composeCopy } from "../../use-cases/copy.ts";
import { composeExportHtml } from "../../use-cases/export-html.ts";
import CommandPalette from "../command/CommandPalette.vue";
import CompatibilityDiffView from "../diagnostics/CompatibilityDiffView.vue";
import DiagnosticsPanel from "../diagnostics/DiagnosticsPanel.vue";
import PreviewPane from "../editor/PreviewPane.vue";
import SourcePane from "../editor/SourcePane.vue";
import PaintDrawer from "../paint/PaintDrawer.vue";
import ContextMenu from "../panel/ContextMenu.vue";
import InsertDrawer from "../panel/InsertDrawer.vue";
import LeftPanelTabs from "../panel/LeftPanelTabs.vue";
import ZhTypoPreviewModal from "../zh-typo/ZhTypoPreviewModal.vue";
import ResizableSplitter from "./ResizableSplitter.vue";
import StatusBar from "./StatusBar.vue";
import TopBar from "./TopBar.vue";

const editorStore = useEditorStore();
const preferencesStore = usePreferencesStore();
const { pushToast } = useToast();
const zhTypo = useZhTypo();
const keywordLint = useKeywordLint();

// Component refs for bidirectional highlight wiring
const previewPaneRef = ref<
  (ComponentPublicInstance & { iframeEl: HTMLIFrameElement | null }) | null
>(null);
const sourcePaneRef = ref<
  (ComponentPublicInstance & { editorView: import("@codemirror/view").EditorView | null }) | null
>(null);

const { attachPreviewClickListener, detachPreviewClickListener, highlightPreviewNode } =
  useBidirectionalHighlight({
    getIframe: () => previewPaneRef.value?.iframeEl ?? null,
    setCursorToLine: (line: number) => {
      const view = sourcePaneRef.value?.editorView;
      if (!view) return;
      const doc = view.state.doc;
      const targetLine = Math.min(Math.max(line, 1), doc.lines);
      const pos = doc.line(targetLine).from;
      view.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
    },
    onNodeHighlight: () => {},
  });

function onSourceSelectionChange(cursorLine: number): void {
  highlightPreviewNode(editorStore.nodeLocations, cursorLine);
}

const dirtySinceBackup = ref(false);

function onSourceValueChange(v: string): void {
  dirtySinceBackup.value = true;
  editorStore.setContent(v);
}

useAutoBackup({
  getDocId: () => editorStore.currentDocId,
  isDirty: () => dirtySinceBackup.value,
  onBackedUp: () => {
    dirtySinceBackup.value = false;
  },
});

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
const isDiagnosticsExpanded = ref(false);
const isDiffOpen = ref(false);
const diffNodeSelector = ref<string | undefined>(undefined);
const isCommandPaletteOpen = ref(false);
const isInsertDrawerOpen = ref(false);
const isContextMenuOpen = ref(false);
const isPaintDrawerOpen = ref(false);

function switchTheme(themeId: string): void {
  editorStore.currentTheme = themeId;
  editorStore.updatePreview(editorStore.content);
}

const commandPaletteCommands = computed<CommandDefinition[]>(() => {
  listThemes();
  return buildEditorCommands({ switchTheme });
});

const FALLBACK_THEME_ACCENT = "#2D5A4E";

const currentThemeName = computed(() => {
  const def = describeTheme(editorStore.currentTheme);
  return def?.name ?? editorStore.currentTheme;
});

const currentThemeAccent = computed(() => {
  const tokens = describeTheme(editorStore.currentTheme)?.tokens;
  const brand = tokens && (tokens as Record<string, string>)["--color-brand"];
  return typeof brand === "string" ? brand : FALLBACK_THEME_ACCENT;
});

const diagnostics = computed<DiagnosticReport>(() => {
  const base = editorStore.lastReport;
  if (keywordLint.keywordDiagnostics.value.length === 0) return base;
  return {
    ...base,
    diagnostics: [...base.diagnostics, ...keywordLint.keywordDiagnostics.value],
  };
});

const statusBarMetrics = computed(() => ({
  ...countWords(editorStore.content),
  readMinutes: 1,
}));

function onToggleDiagnostics(): void {
  isDiagnosticsExpanded.value = !isDiagnosticsExpanded.value;
}

function onShowDiff(nodeSelector: string): void {
  diffNodeSelector.value = nodeSelector;
  isDiffOpen.value = true;
}

function onCloseDiff(): void {
  isDiffOpen.value = false;
}

const diffRecords = computed(() =>
  editorStore.lastReport.nodeChangeRecords.filter((r) => r.nodeSelector === diffNodeSelector.value)
);

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
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    isCommandPaletteOpen.value = true;
  }
}

function onCommandPaletteExecute(cmd: CommandDefinition): void {
  cmd.run();
}

function openDrawer(): void {
  isDrawerOpen.value = true;
}

function closeDrawer(): void {
  isDrawerOpen.value = false;
}

function onInsertDirective(directive: string): void {
  const view = sourcePaneRef.value?.editorView;
  if (view) {
    const pos = view.state.selection.main.head;
    view.dispatch({
      changes: { from: pos, insert: `\n${directive}\n` },
      selection: { anchor: pos },
    });
  } else {
    const newContent = `${editorStore.content ? `${editorStore.content}\n` : ""}${directive}\n`;
    onSourceValueChange(newContent);
  }
  isInsertDrawerOpen.value = false;
}

function onContextMenuCommand(commandId: string): void {
  if (commandId === "content-zh-typo") {
    zhTypo.openZhTypoPreview(editorStore.content);
    return;
  }
  if (commandId === "settings-paint") {
    isPaintDrawerOpen.value = true;
    return;
  }
  if (commandId === "content-keyword-lint") {
    keywordLint.runKeywordLint();
    isDiagnosticsExpanded.value = true;
    return;
  }
  const cmds = buildEditorCommands({ switchTheme, downloadHtml: onDownloadHtml });
  const cmd = cmds.find((c) => c.id === commandId);
  cmd?.run();
}

async function onZhTypoConfirm(): Promise<void> {
  const view = sourcePaneRef.value?.editorView ?? null;
  await zhTypo.confirmRevision({ editorView: view });
}

function onCopyHtml(): void {
  composeCopy({
    markdown: editorStore.content,
    themeId: editorStore.currentTheme,
    notify: pushToast,
  });
}

async function onDownloadHtml(): Promise<void> {
  const html = await composeExportHtml({
    markdown: editorStore.content,
    themeId: editorStore.currentTheme,
  });
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "wechat-flow.html";
  anchor.click();
  URL.revokeObjectURL(url);
}

onMounted(() => {
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", onResize);
  leftPanel.init();
  rightPanel.init();
  preferencesStore.init();
  editorStore.loadDraft();
  attachPreviewClickListener();
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("resize", onResize);
  detachPreviewClickListener();
});
</script>

<template>
  <div class="editor-shell" :class="{ 'editor-shell--focus': isFocusMode }" data-testid="editor-shell">
    <!-- TopBar -->
    <!-- cataforge: wiring-placeholder — onUndo/onRedo 接线延后至对应功能任务 -->
    <TopBar
      doc-title="Untitled"
      :theme-name="currentThemeName"
      :theme-accent-color="currentThemeAccent"
      sync-state="idle"
      :is-focus-mode="isFocusMode"
      :has-unsaved-changes="false"
      :can-undo="false"
      :can-redo="false"
      :on-undo="() => {}"
      :on-redo="() => {}"
      :on-copy="onCopyHtml"
      :on-insert="() => { isInsertDrawerOpen = true; }"
      :on-more="() => { isContextMenuOpen = !isContextMenuOpen; }"
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
        <LeftPanelTabs default-tab="theme" :on-theme-select="switchTheme" :on-insert-block="onInsertDirective" />
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
        <SourcePane
          ref="sourcePaneRef"
          :model-value="editorStore.content"
          :on-value-change="onSourceValueChange"
          :on-selection-change="onSourceSelectionChange"
          :font-size="preferencesStore.fontSize"
          :input-assist="preferencesStore.inputAssist"
        />
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
          ref="previewPaneRef"
          :html-content="editorStore.previewHtml"
          :viewport="previewViewport"
          :on-viewport-change="(v) => (previewViewport = v as '375' | '768' | 'auto')"
          :line-height="preferencesStore.lineHeight"
          sync-state="idle"
        />
      </aside>
    </div>

    <!-- Diagnostics panel (above status bar, collapsible) -->
    <DiagnosticsPanel
      :diagnostics="diagnostics"
      :is-expanded="isDiagnosticsExpanded"
      @toggle="onToggleDiagnostics"
      @show-diff="onShowDiff"
    />

    <!-- Compatibility diff modal -->
    <CompatibilityDiffView
      :is-open="isDiffOpen"
      :node-selector="diffNodeSelector"
      :node-change-records="diffRecords"
      @close="onCloseDiff"
    />

    <!-- Status bar -->
    <StatusBar :diagnostics="diagnostics" :metrics="statusBarMetrics" :is-diagnostics-expanded="isDiagnosticsExpanded" @toggle-diagnostics="onToggleDiagnostics" />

    <!-- Command Palette -->
    <CommandPalette
      :is-open="isCommandPaletteOpen"
      :commands="commandPaletteCommands"
      :on-close="() => { isCommandPaletteOpen = false; }"
      :on-execute="onCommandPaletteExecute"
    />

    <!-- Insert Drawer -->
    <InsertDrawer
      :is-open="isInsertDrawerOpen"
      :on-insert="onInsertDirective"
      :on-close="() => { isInsertDrawerOpen = false; }"
    />

    <!-- Paint Drawer -->
    <PaintDrawer
      :is-open="isPaintDrawerOpen"
      @close="isPaintDrawerOpen = false"
    />

    <!-- Context Menu -->
    <ContextMenu
      :is-open="isContextMenuOpen"
      :is-content-empty="editorStore.content.trim() === ''"
      :is-zh-typo-disabled="editorStore.content.trim() === '' || !zhTypo.hasZhTypoIssues(editorStore.content)"
      :on-close="() => { isContextMenuOpen = false; }"
      :on-command="onContextMenuCommand"
    />

    <!-- ZhTypo Preview Modal -->
    <ZhTypoPreviewModal
      :is-open="zhTypo.isPreviewOpen.value"
      :diff="zhTypo.diff.value"
      :per-rule="zhTypo.perRule.value"
      :total-changes="zhTypo.totalChanges.value"
      :on-confirm="onZhTypoConfirm"
      :on-cancel="zhTypo.cancel"
    />
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
