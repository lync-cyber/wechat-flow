<script setup lang="ts">
import type { BlockCategory, BlockDefinition } from "@wechat-flow/core";
import type { MarkDefinition } from "@wechat-flow/core";
import { computed, ref, watch } from "vue";
import type { SnippetOptions } from "../../editor/extensions/directive-completion.ts";
import { buildCandidates } from "../../editor/extensions/directive-completion.ts";
import { blockGlyph } from "../common/block-glyphs.ts";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "../panel/category-labels.ts";

const props = defineProps<{
  isOpen: boolean;
  triggerType: "block" | "inline";
  blocks: BlockDefinition[];
  marks: MarkDefinition[];
  currentInput: string;
  onSelect: (payload: SnippetOptions) => void;
  onClose: () => void;
  onOpenInsertDrawer?: () => void;
}>();

const MAX_INLINE_PARAM_FIELDS = 3;

const activeIndex = ref(0);
const activeTab = ref<"block" | "inline">(props.triggerType);
const selectedBlock = ref<BlockDefinition | null>(null);
const selectedVariantId = ref<string | null>(null);
const paramValues = ref<Record<string, string>>({});
const activeCategory = ref<BlockCategory | null>(null);

function resetSelection(): void {
  selectedBlock.value = null;
  selectedVariantId.value = null;
  paramValues.value = {};
}

watch(
  () => props.triggerType,
  (triggerType) => {
    activeTab.value = triggerType;
    activeCategory.value = null;
    resetSelection();
  }
);

watch(
  () => props.currentInput,
  () => {
    resetSelection();
  }
);

watch(
  () => props.isOpen,
  (open) => {
    if (!open) {
      resetSelection();
      activeTab.value = props.triggerType;
      activeCategory.value = null;
    }
  }
);

// 分类 tab 依 registry 实际内容数据驱动（A-014：分类命名不硬编码）
const tabs = computed<Array<{ id: "block" | "inline"; label: string }>>(() => {
  const result: Array<{ id: "block" | "inline"; label: string }> = [];
  if (props.marks.length > 0) result.push({ id: "inline", label: "行内" });
  if (props.blocks.length > 0) result.push({ id: "block", label: "块级" });
  return result;
});

const availableCategories = computed<BlockCategory[]>(() => {
  const present = new Set(props.blocks.map((b) => b.category));
  return CATEGORY_ORDER.filter((c) => present.has(c));
});

function selectCategory(category: BlockCategory): void {
  activeCategory.value = activeCategory.value === category ? null : category;
}

const categoryFilteredBlocks = computed(() =>
  activeCategory.value === null
    ? props.blocks
    : props.blocks.filter((b) => b.category === activeCategory.value)
);

const candidates = computed(() =>
  buildCandidates(activeTab.value, props.currentInput, categoryFilteredBlocks.value, props.marks)
);

watch(candidates, () => {
  activeIndex.value = 0;
});

interface NameSegment {
  text: string;
  hit: boolean;
}

function segmentsOf(text: string): NameSegment[] {
  const q = props.currentInput.toLowerCase();
  if (q === "") return [{ text, hit: false }];
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return [{ text, hit: false }];
  return [
    { text: text.slice(0, idx), hit: false },
    { text: text.slice(idx, idx + q.length), hit: true },
    { text: text.slice(idx + q.length), hit: false },
  ].filter((seg) => seg.text !== "");
}

function paramFieldsOf(block: BlockDefinition): string[] {
  try {
    const shape = (block.attrsSchema as { shape?: Record<string, unknown> }).shape;
    return shape ? Object.keys(shape) : [];
  } catch {
    return [];
  }
}

const visibleParamFields = computed(() =>
  selectedBlock.value ? paramFieldsOf(selectedBlock.value).slice(0, MAX_INLINE_PARAM_FIELDS) : []
);

const hasMoreParams = computed(
  () =>
    selectedBlock.value !== null &&
    paramFieldsOf(selectedBlock.value).length > MAX_INLINE_PARAM_FIELDS
);

const canInsert = computed(
  () =>
    selectedBlock.value !== null &&
    (selectedBlock.value.variants.length === 0 || selectedVariantId.value !== null)
);

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === "Escape") {
    props.onClose();
  }
}

function pickCandidate(index: number): void {
  const candidate = candidates.value[index];
  if (!candidate) return;
  if (candidate.type === "inline") {
    props.onSelect({ type: "inline", blockId: candidate.id });
    return;
  }
  const block = props.blocks.find((b) => b.id === candidate.id);
  if (!block) return;
  if (block.variants.length === 0 && paramFieldsOf(block).length === 0) {
    props.onSelect({ type: "block", blockId: block.id });
    return;
  }
  selectedBlock.value = block;
  selectedVariantId.value = block.variants[0]?.id ?? null;
  paramValues.value = {};
}

function handleInsert(): void {
  const block = selectedBlock.value;
  if (!block || !canInsert.value) return;
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(paramValues.value)) {
    if (value.trim() !== "") params[key] = value.trim();
  }
  props.onSelect({
    type: "block",
    blockId: block.id,
    variantId: selectedVariantId.value ?? undefined,
    params: Object.keys(params).length > 0 ? params : undefined,
  });
}

function handleOpenInsertDrawer(): void {
  props.onClose();
  props.onOpenInsertDrawer?.();
}
</script>

<template>
  <div
    v-if="isOpen"
    class="directive-autocomplete-popover"
    data-testid="directive-autocomplete-popover"
    @keydown="handleKeydown"
  >
    <template v-if="!selectedBlock">
      <div class="dap__search" data-testid="autocomplete-search">
        {{ currentInput || (triggerType === "block" ? ":::" : ":") }}
      </div>
      <div class="dap__tabs" data-testid="autocomplete-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="dap__tab"
          :class="{ 'dap__tab--active': activeTab === tab.id }"
          :data-testid="`autocomplete-tab-${tab.id}`"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
      <div
        v-if="activeTab === 'block'"
        class="dap__category-row"
        data-testid="autocomplete-category-row"
        :style="{ height: '32px' }"
      >
        <button
          v-for="category in availableCategories"
          :key="category"
          type="button"
          class="dap__category-tab"
          :class="{ 'dap__category-tab--active': activeCategory === category }"
          :data-testid="`autocomplete-category-tab-${category}`"
          @click="selectCategory(category)"
        >
          {{ CATEGORY_LABELS[category] }}
        </button>
      </div>
      <div class="dap__list">
        <div
          v-for="(candidate, index) in candidates"
          :key="candidate.id"
          data-testid="autocomplete-item"
          class="autocomplete-item"
          :class="{ active: index === activeIndex }"
          :aria-selected="index === activeIndex ? 'true' : 'false'"
          @click="pickCandidate(index)"
        >
          <span class="autocomplete-item__glyph">{{ blockGlyph(candidate.id, candidate.type) }}</span>
          <span class="autocomplete-item__id">
            <template v-for="(seg, segIndex) in segmentsOf(candidate.id)" :key="segIndex">
              <span :class="{ 'autocomplete-item__hit': seg.hit }">{{ seg.text }}</span>
            </template>
          </span>
          <span class="autocomplete-item__name">{{ candidate.name }}</span>
          <span
            v-if="candidate.type === 'block'"
            class="autocomplete-item__count"
            data-testid="autocomplete-variant-count"
          >{{ candidate.variantCount }}</span>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="dap__search dap__search--selected" data-testid="autocomplete-selected-name">
        {{ selectedBlock.id }}
      </div>
      <button
        type="button"
        class="dap__breadcrumb"
        data-testid="autocomplete-breadcrumb"
        @click="resetSelection"
      >
        ← {{ selectedBlock.id }}
      </button>
      <div class="dap__variants" data-testid="autocomplete-variant-list">
        <div
          v-for="variant in selectedBlock.variants"
          :key="variant.id"
          class="dap__variant"
          :class="{ 'dap__variant--active': selectedVariantId === variant.id }"
          :data-testid="`autocomplete-variant-${variant.id}`"
          @click="selectedVariantId = variant.id"
        >
          {{ variant.id }}<span v-if="variant.label" class="dap__variant-label"> · {{ variant.label }}</span>
        </div>
      </div>
      <div v-if="visibleParamFields.length > 0" class="dap__params" data-testid="autocomplete-params">
        <div class="dap__params-label">参数</div>
        <input
          v-for="field in visibleParamFields"
          :key="field"
          v-model="paramValues[field]"
          class="dap__param-input"
          :data-testid="`autocomplete-param-${field}`"
          type="text"
          :placeholder="field"
        />
        <button
          v-if="hasMoreParams"
          type="button"
          class="dap__more-params"
          data-testid="autocomplete-more-params"
          @click="handleOpenInsertDrawer"
        >
          在 InsertDrawer 中配置
        </button>
      </div>
      <div class="dap__footer">
        <button
          type="button"
          class="dap__insert"
          data-testid="autocomplete-insert"
          :disabled="!canInsert"
          @click="handleInsert"
        >
          插入
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.directive-autocomplete-popover {
  width: 280px;
  max-height: 320px;
  display: flex;
  flex-direction: column;
  background: var(--color-surface, #faf8f5);
  border: 1px solid var(--color-border, #d4cfc6);
  box-shadow: var(--shadow-base, 0 2px 8px rgba(0, 0, 0, 0.12));
  border-radius: var(--radius-md, 6px);
  z-index: var(--z-dropdown, 200);
  position: absolute;
  overflow: hidden;
}

@media (max-width: 1279px) {
  .directive-autocomplete-popover {
    width: 240px;
  }
}

.dap__search {
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  margin: var(--space-2, 8px);
  padding: 0 var(--space-2, 8px);
  font-family: var(--font-mono, monospace);
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-primary, #1c1917);
  background: var(--color-surface-elevated, #f4f1ec);
  border: 1px solid var(--color-border, #d4cfc6);
  border-radius: var(--radius-base, 4px);
  overflow: hidden;
  white-space: nowrap;
}

.dap__search--selected {
  font-weight: var(--font-weight-semibold, 600);
}

.dap__tabs {
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--space-3, 12px);
  padding: 0 var(--space-3, 12px);
  border-bottom: 1px solid var(--color-border-subtle, #e8e4dc);
  overflow-x: auto;
}

.dap__tab {
  background: none;
  border: none;
  padding: 0;
  height: 100%;
  cursor: pointer;
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-secondary, #8a7d6b);
  white-space: nowrap;
}

.dap__category-row {
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  padding: 0 var(--space-3, 12px);
  border-bottom: 1px solid var(--color-border-subtle, #e8e4dc);
  overflow-x: auto;
}

.dap__category-tab {
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 0 var(--space-1, 4px);
  height: 100%;
  cursor: pointer;
  font-size: var(--font-size-xs, 11px);
  color: var(--color-text-secondary, #8a7d6b);
  white-space: nowrap;
}

.dap__category-tab--active {
  color: var(--color-brand, #2d5a4e);
  font-weight: var(--font-weight-semibold, 600);
}

.dap__tab--active {
  color: var(--color-brand, #2d5a4e);
  font-weight: var(--font-weight-semibold, 600);
}

.dap__list {
  flex: 1;
  overflow-y: auto;
}

.autocomplete-item {
  height: 36px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
  cursor: pointer;
}

.autocomplete-item.active {
  background: var(--color-surface-elevated, #f4f1ec);
}

.autocomplete-item__glyph {
  width: 16px;
  flex-shrink: 0;
  text-align: center;
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-secondary, #8a7d6b);
}

.autocomplete-item__id {
  font-family: var(--font-mono, monospace);
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-primary, #1c1917);
}

.autocomplete-item__hit {
  color: var(--color-brand, #2d5a4e);
  font-weight: var(--font-weight-bold, 700);
}

.autocomplete-item__name {
  flex: 1;
  font-size: var(--font-size-xs, 11px);
  color: var(--color-text-secondary, #8a7d6b);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.autocomplete-item__count {
  flex-shrink: 0;
  min-width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border-radius: var(--radius-full, 999px);
  background: var(--color-surface-elevated, #f4f1ec);
  font-size: var(--font-size-xs, 11px);
  color: var(--color-text-secondary, #8a7d6b);
}

.dap__breadcrumb {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  background: none;
  border: none;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  cursor: pointer;
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-secondary, #8a7d6b);
}

.dap__breadcrumb:hover {
  color: var(--color-brand, #2d5a4e);
}

.dap__variants {
  flex: 1;
  overflow-y: auto;
}

.dap__variant {
  height: 32px;
  display: flex;
  align-items: center;
  padding: 0 var(--space-3, 12px);
  cursor: pointer;
  font-family: var(--font-mono, monospace);
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-primary, #1c1917);
}

.dap__variant:hover {
  background: var(--color-surface-overlay, #f0ece5);
}

.dap__variant--active {
  background: var(--color-surface-elevated, #f4f1ec);
  color: var(--color-brand, #2d5a4e);
}

.dap__variant-label {
  font-family: var(--font-family-body, sans-serif);
  color: var(--color-text-secondary, #8a7d6b);
}

.dap__params {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1, 4px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border-top: 1px solid var(--color-border-subtle, #e8e4dc);
}

.dap__params-label {
  font-size: var(--font-size-xs, 11px);
  color: var(--color-text-muted, #a89d8d);
}

.dap__param-input {
  height: 28px;
  padding: 0 var(--space-2, 8px);
  border: 1px solid var(--color-border, #d4cfc6);
  border-radius: var(--radius-base, 4px);
  background: var(--color-surface-elevated, #f4f1ec);
  font-family: var(--font-mono, monospace);
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-primary, #1c1917);
  outline: none;
}

.dap__param-input:focus {
  border-color: var(--color-brand, #2d5a4e);
}

.dap__more-params {
  align-self: flex-start;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: var(--font-size-xs, 11px);
  color: var(--color-brand, #2d5a4e);
  text-decoration: underline;
}

.dap__footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  padding: var(--space-2, 8px) var(--space-3, 12px);
}

.dap__insert {
  height: 28px;
  padding: 0 var(--space-4, 16px);
  background: var(--color-brand, #2d5a4e);
  color: var(--color-text-inverse, #fafaf9);
  border: none;
  border-radius: var(--radius-base, 4px);
  cursor: pointer;
  font-size: var(--font-size-sm, 13px);
}

.dap__insert:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
