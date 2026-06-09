<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useCodemirror } from "../../composables/use-codemirror";

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    readonly?: boolean;
    onValueChange?: (value: string) => void;
  }>(),
  {
    modelValue: "",
    readonly: false,
    onValueChange: undefined,
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const editorContainer = ref<HTMLElement | null>(null);

const { mount, destroy, setValue, editorView } = useCodemirror({
  initialValue: props.modelValue,
  readonly: props.readonly,
  onValueChange: props.onValueChange
    ? props.onValueChange
    : (value: string) => emit("update:modelValue", value),
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
