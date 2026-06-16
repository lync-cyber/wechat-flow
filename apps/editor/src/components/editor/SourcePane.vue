<script setup lang="ts">
import { listBlocks } from "@wechat-flow/core";
import { listMarks } from "@wechat-flow/core";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useCodemirror } from "../../composables/use-codemirror";
import {
  buildDirectiveSnippet,
  registerDirectiveCompletion,
} from "../../editor/extensions/directive-completion.ts";
import DirectiveAutocompletePopover from "./DirectiveAutocompletePopover.vue";

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    readonly?: boolean;
    onValueChange?: (value: string) => void;
    onSelectionChange?: (cursorLine: number) => void;
  }>(),
  {
    modelValue: "",
    readonly: false,
    onValueChange: undefined,
    onSelectionChange: undefined,
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const editorContainer = ref<HTMLElement | null>(null);

const isAutocompleteOpen = ref(false);
const autocompleteTriggerType = ref<"block" | "inline">("block");
const autocompleteInput = ref("");
const popoverPosition = ref({ left: 0, top: 0 });
let autocompleteRange = { from: 0, to: 0 };

const availableBlocks = computed(() => listBlocks());
const availableMarks = computed(() => listMarks());

function closeAutocomplete(): void {
  isAutocompleteOpen.value = false;
}

function onAutocompleteSelect(payload: { type: "block" | "inline"; blockId: string }): void {
  const view = editorView.value;
  if (view) {
    const snippet = buildDirectiveSnippet({ type: payload.type, blockId: payload.blockId });
    // cursor lands on the content slot (block: empty middle line; inline: inside brackets)
    // so the directive prefix no longer matches and the popover does not re-trigger
    const cursorOffset =
      payload.type === "block" ? snippet.indexOf("\n") + 1 : snippet.indexOf("[") + 1;
    view.dispatch({
      changes: { from: autocompleteRange.from, to: autocompleteRange.to, insert: snippet },
      selection: { anchor: autocompleteRange.from + cursorOffset },
    });
    view.focus();
  }
  isAutocompleteOpen.value = false;
}

const directiveCompletionExtension = registerDirectiveCompletion({
  onClose: closeAutocomplete,
  onSelect: onAutocompleteSelect,
  onTrigger: (context) => {
    autocompleteTriggerType.value = context.triggerType;
    autocompleteInput.value = context.query;
    autocompleteRange = { from: context.from, to: context.to };
    if (context.coords) {
      popoverPosition.value = context.coords;
    }
    isAutocompleteOpen.value = true;
  },
});

const { mount, destroy, setValue, editorView } = useCodemirror({
  initialValue: props.modelValue,
  readonly: props.readonly,
  onValueChange: props.onValueChange
    ? props.onValueChange
    : (value: string) => emit("update:modelValue", value),
  onSelectionChange: props.onSelectionChange,
  extraExtensions: [directiveCompletionExtension],
});

defineExpose({ editorView });

onMounted(() => {
  if (editorContainer.value) {
    mount(editorContainer.value);
  }
});

onBeforeUnmount(() => {
  destroy();
});

watch(
  () => props.modelValue,
  (newVal) => {
    setValue(newVal ?? "");
  }
);
</script>

<template>
  <div class="source-pane" data-testid="source-pane" :class="{ 'source-pane--readonly': readonly }">
    <div
      v-if="readonly"
      class="source-pane__readonly-banner"
      data-testid="readonly-banner"
      role="status"
      aria-label="只读模式"
    >
      只读模式 — 当前文档不可编辑
    </div>
    <div
      ref="editorContainer"
      class="source-pane__editor"
      data-testid="source-pane-editor"
    />
    <DirectiveAutocompletePopover
      :is-open="isAutocompleteOpen"
      :trigger-type="autocompleteTriggerType"
      :blocks="availableBlocks"
      :marks="availableMarks"
      :current-input="autocompleteInput"
      :on-select="onAutocompleteSelect"
      :on-close="closeAutocomplete"
      :style="{ position: 'fixed', left: `${popoverPosition.left}px`, top: `${popoverPosition.top}px` }"
    />
  </div>
</template>

<style scoped>
.source-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--color-surface, #faf8f5);
}

.source-pane--readonly .source-pane__editor {
  background: var(--color-surface-elevated, #f4f1ec);
  cursor: default;
}

.source-pane--readonly .source-pane__editor :deep(.cm-content) {
  background: var(--color-surface-elevated, #f4f1ec);
  cursor: default;
}

.source-pane--readonly .source-pane__editor :deep(.cm-editor) {
  background: var(--color-surface-elevated, #f4f1ec);
  cursor: default;
}

.source-pane__readonly-banner {
  height: 28px;
  min-height: 28px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: var(--color-warning, #8c6a1a);
  color: var(--color-text-inverse, #faf8f5);
  font-size: var(--font-size-xs, 11px);
  font-weight: var(--font-weight-medium, 500);
  flex-shrink: 0;
}

.source-pane__editor {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.source-pane__editor :deep(.cm-editor) {
  height: 100%;
  overflow: auto;
}
</style>
