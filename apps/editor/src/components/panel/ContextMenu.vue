<script setup lang="ts">
import { computed } from "vue";
import DropdownMenu from "../common/DropdownMenu.vue";
import type { MenuItem } from "../common/DropdownMenu.vue";

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    isContentEmpty: boolean;
    isZhTypoDisabled?: boolean | null;
    onClose: () => void;
    onCommand: (commandId: string) => void;
  }>(),
  { isZhTypoDisabled: null }
);

const menuItems = computed<MenuItem[]>(() => [
  { id: "doc-load-example", label: "载入示例文档" },
  {
    id: "content-zh-typo",
    label: "中文排版修订",
    disabled:
      props.isZhTypoDisabled !== null ? (props.isZhTypoDisabled as boolean) : props.isContentEmpty,
  },
  { type: "separator" },
  { id: "export-copy-html", label: "复制 HTML", shortcut: "Ctrl+Shift+C" },
  { id: "export-download-html", label: "下载 HTML" },
  { type: "separator" },
  { type: "separator" },
  { id: "settings-paint", label: "自定义配色" },
  { id: "help-shortcuts", label: "快捷键手册", shortcut: "?" },
  { id: "help-whats-new", label: "新功能说明" },
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
    :items="menuItems"
    :on-select="handleSelect"
    :on-close="onClose"
  />
  <div v-else aria-hidden="true" />
</template>
