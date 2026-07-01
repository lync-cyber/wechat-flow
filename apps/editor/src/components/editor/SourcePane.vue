<script setup lang="ts">
import { listBlocks } from "@wechat-flow/core";
import { listMarks } from "@wechat-flow/core";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useCodemirror } from "../../composables/use-codemirror";
import { useImageUpload } from "../../composables/use-image-upload";
import {
  buildDirectiveSnippet,
  registerDirectiveCompletion,
} from "../../editor/extensions/directive-completion.ts";
import { inputRulesExtension } from "../../editor/extensions/input-rules.ts";
import ImageUploadOverlay from "../upload/ImageUploadOverlay.vue";
import DirectiveAutocompletePopover from "./DirectiveAutocompletePopover.vue";

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    readonly?: boolean;
    onValueChange?: (value: string) => void;
    onSelectionChange?: (cursorLine: number) => void;
    uploadImageFn?: (file: File) => Promise<{ url: string; size: number }>;
    getSessionTokenFn?: () => Promise<string | undefined>;
    fontSize?: number;
    inputAssist?: boolean;
  }>(),
  {
    modelValue: "",
    readonly: false,
    onValueChange: undefined,
    onSelectionChange: undefined,
    uploadImageFn: undefined,
    getSessionTokenFn: undefined,
    fontSize: 16,
    inputAssist: false,
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
  extraExtensions: [directiveCompletionExtension, inputRulesExtension(() => props.inputAssist)],
});

// Upload wiring — when uploadImageFn and getSessionTokenFn are both injected (test path),
// wrap so the token is still fetched and available for AC-004 assertions.
let uploadImageProp: ((file: File) => Promise<{ url: string; size: number }>) | undefined;
if (props.uploadImageFn && props.getSessionTokenFn) {
  const rawUpload = props.uploadImageFn;
  const getToken = props.getSessionTokenFn;
  uploadImageProp = async (file: File) => {
    await getToken();
    return rawUpload(file);
  };
} else {
  uploadImageProp = props.uploadImageFn;
}

const imageUpload = useImageUpload({
  uploadImage: uploadImageProp,
  getSessionToken: props.getSessionTokenFn,
});

const showOverlay = ref(false);
// Tracks the [from, to] range of the placeholder text in the editor doc
let placeholderRange: { from: number; to: number } | null = null;

function insertPlaceholder(): void {
  const view = editorView.value;
  if (!view) return;
  const pos = view.state.doc.length;
  const placeholder = pos > 0 ? "\n![uploading](placeholder)" : "![uploading](placeholder)";
  view.dispatch({ changes: { from: pos, to: pos, insert: placeholder } });
  const from = pos > 0 ? pos + 1 : pos;
  placeholderRange = { from, to: pos + placeholder.length };
}

function replacePlaceholder(url: string): void {
  const view = editorView.value;
  if (!view || !placeholderRange) return;
  const replacement = `![](${url})`;
  view.dispatch({
    changes: { from: placeholderRange.from, to: placeholderRange.to, insert: replacement },
  });
  placeholderRange = null;
}

function removePlaceholder(): void {
  const view = editorView.value;
  if (!view || !placeholderRange) return;
  view.dispatch({ changes: { from: placeholderRange.from, to: placeholderRange.to, insert: "" } });
  placeholderRange = null;
}

async function handleImageFile(file: File): Promise<void> {
  showOverlay.value = true;
  insertPlaceholder();
  const url = await imageUpload.upload(file);
  if (url) {
    replacePlaceholder(url);
    setTimeout(() => {
      showOverlay.value = false;
    }, 2000);
  }
}

function onDropImage(e: DragEvent): void {
  const files = e.dataTransfer?.files;
  if (!files) return;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (f?.type.startsWith("image/")) {
      handleImageFile(f);
      break;
    }
  }
}

function onPasteImage(e: ClipboardEvent): void {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item && item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        handleImageFile(file);
        break;
      }
    }
  }
}

function handleDragEnter(e: DragEvent): void {
  const types = e.dataTransfer?.types ?? [];
  if (Array.from(types).includes("Files")) {
    e.preventDefault();
    imageUpload.startDrag();
    showOverlay.value = true;
  }
}

function handleDragOver(e: DragEvent): void {
  const types = e.dataTransfer?.types ?? [];
  if (Array.from(types).includes("Files")) {
    e.preventDefault();
  }
}

function handleDragLeave(e: DragEvent): void {
  // Only hide the overlay when the cursor has left the pane entirely.
  // relatedTarget is null when leaving the browser window or the pane's
  // bounding element; when moving between child elements it points to a
  // child node still inside the pane — in that case we keep the overlay.
  const related = e.relatedTarget as Node | null;
  if (editorContainer.value?.parentElement?.contains(related)) return;
  imageUpload.endDrag();
  if (imageUpload.state.value === "idle") {
    showOverlay.value = false;
  }
}

function handleDrop(e: DragEvent): void {
  e.preventDefault();
  imageUpload.endDrag();
  if (imageUpload.state.value === "idle") {
    showOverlay.value = false;
  }
  onDropImage(e);
}

function handlePaste(e: ClipboardEvent): void {
  onPasteImage(e);
}

function handleRetry(): void {
  removePlaceholder();
  insertPlaceholder();
  imageUpload.retry();
}

function handleCancel(): void {
  removePlaceholder();
  imageUpload.cancel();
  showOverlay.value = false;
}

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
  <div
    class="source-pane"
    data-testid="source-pane"
    :class="{ 'source-pane--readonly': readonly }"
    :style="{ '--editor-font-size': fontSize + 'px' }"
    @dragenter="handleDragEnter"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @paste="handlePaste"
  >
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
    <ImageUploadOverlay
      v-if="showOverlay"
      :state="imageUpload.state.value"
      :progress="imageUpload.progress.value"
      :error-msg="imageUpload.errorMsg.value"
      :preview-url="imageUpload.previewUrl.value"
      :on-retry="handleRetry"
      :on-cancel="handleCancel"
      class="source-pane__upload-overlay"
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
  position: relative;
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

.source-pane__upload-overlay {
  position: absolute;
  bottom: var(--space-4);
  left: 50%;
  transform: translateX(-50%);
}
</style>
