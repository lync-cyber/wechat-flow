<script setup lang="ts">
import { computed } from "vue";
import DropdownMenu from "../common/DropdownMenu.vue";
import type { MenuItem } from "../common/DropdownMenu.vue";

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    isContentEmpty: boolean;
    isZhTypoDisabled?: boolean | null;
    anchor?: HTMLElement | null;
    onClose: () => void;
    onCommand: (commandId: string) => void;
  }>(),
  { isZhTypoDisabled: null, anchor: null }
);

const menuItems = computed<MenuItem[]>(() => [
  { id: "doc-load-example", label: "载入示例文档", icon: "▤" },
  {
    id: "content-zh-typo",
    label: "中文排版修订",
    icon: "文",
    disabled:
      props.isZhTypoDisabled !== null ? (props.isZhTypoDisabled as boolean) : props.isContentEmpty,
  },
  { id: "content-keyword-lint", label: "检测违规词", icon: "⊘", disabled: props.isContentEmpty },
  { type: "separator" },
  { id: "export-copy-html", label: "复制 HTML", icon: "⧉", shortcut: "Ctrl+Shift+C" },
  { id: "export-download-html", label: "下载 HTML", icon: "↓" },
  { type: "separator" },
  { id: "settings-paint", label: "自定义配色", icon: "◐" },
  { id: "help-shortcuts", label: "快捷键手册", icon: "⌨", shortcut: "?" },
  { id: "help-whats-new", label: "新功能说明", icon: "✦" },
]);

function handleSelect(id: string): void {
  props.onCommand(id);
  props.onClose();
}
</script>

<template>
  <DropdownMenu
    v-if="isOpen"
    data-testid="context-menu"
    :is-open="true"
    :anchor="anchor"
    :items="menuItems"
    :on-select="handleSelect"
    :on-close="onClose"
  />
  <div v-else aria-hidden="true" />
</template>
