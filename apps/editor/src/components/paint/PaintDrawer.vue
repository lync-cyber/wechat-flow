<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { usePaintBinding } from "../../composables/use-paint-binding.ts";

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { paintableTokens, currentPaint, themeDefaults, applyPaint, resetPaint } = usePaintBinding();

const HEX_PATTERN = /^#?[0-9a-fA-F]{3,8}$/;

const draft = ref<Record<string, string>>({});
const hexEdits = ref<Record<string, string>>({});
const invalidHex = ref<Record<string, boolean>>({});

function discardDraft(): void {
  draft.value = {};
  hexEdits.value = {};
  invalidHex.value = {};
}

watch(
  () => props.isOpen,
  (open) => {
    if (!open) discardDraft();
  }
);

watch(paintableTokens, discardDraft);

interface PaintRow {
  token: string;
  paintable: boolean;
}

const rows = computed<PaintRow[]>(() => {
  const paintableSet = new Set(paintableTokens.value);
  const extras = Object.keys(currentPaint.value).filter((token) => !paintableSet.has(token));
  return [
    ...paintableTokens.value.map((token) => ({ token, paintable: true })),
    ...extras.map((token) => ({ token, paintable: false })),
  ];
});

const isDirty = computed(() => Object.keys(draft.value).length > 0);

function normalizeHex(value: string): string {
  return value.startsWith("#") ? value : `#${value}`;
}

function displayValue(token: string): string {
  return draft.value[token] ?? currentPaint.value[token] ?? themeDefaults.value[token] ?? "#000000";
}

// 原生 <input type=color> 仅接受 #RRGGBB，做展示级归一
function toColorInputHex(value: string): string {
  const hex = normalizeHex(value);
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  if (/^#[0-9a-fA-F]{8}$/.test(hex)) return hex.slice(0, 7);
  return "#000000";
}

function hexInputValue(token: string): string {
  return hexEdits.value[token] ?? displayValue(token);
}

function onPick(token: string, event: Event): void {
  const color = (event.target as HTMLInputElement).value;
  draft.value = { ...draft.value, [token]: color };
  delete hexEdits.value[token];
  invalidHex.value = { ...invalidHex.value, [token]: false };
}

function onHexInput(token: string, event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  hexEdits.value = { ...hexEdits.value, [token]: value };
  if (!HEX_PATTERN.test(value)) {
    invalidHex.value = { ...invalidHex.value, [token]: true };
    return;
  }
  invalidHex.value = { ...invalidHex.value, [token]: false };
  draft.value = { ...draft.value, [token]: normalizeHex(value) };
}

function onHexBlur(token: string): void {
  const edits = { ...hexEdits.value };
  delete edits[token];
  hexEdits.value = edits;
  invalidHex.value = { ...invalidHex.value, [token]: false };
}

function onApply(): void {
  if (!isDirty.value) return;
  applyPaint({ ...currentPaint.value, ...draft.value });
  discardDraft();
}

function onReset(): void {
  resetPaint();
  discardDraft();
}
</script>

<template>
  <div
    v-if="isOpen"
    class="paint-drawer"
    data-testid="paint-drawer"
    :style="{ width: '320px' }"
  >
    <div class="paint-drawer__header" data-testid="paint-drawer-header">
      <span class="paint-drawer__title">自定义配色</span>
      <button
        type="button"
        class="paint-drawer__close"
        data-testid="paint-drawer-close"
        aria-label="关闭"
        @click="emit('close')"
      >✕</button>
    </div>

    <div class="paint-drawer__list" data-testid="paint-drawer-list">
      <div
        v-if="rows.length === 0"
        class="paint-drawer__empty"
        data-testid="paint-drawer-empty"
      >
        当前主题未声明可配色 token
      </div>
      <template v-for="row in rows" :key="row.token">
        <div
          class="paint-drawer__row"
          :data-testid="`paint-token-${row.token}`"
        >
          <span class="paint-drawer__token-name">{{ row.token }}</span>
          <div class="paint-drawer__value-line">
            <span class="paint-drawer__swatch">
              <input
                type="color"
                class="paint-drawer__color-input"
                :value="toColorInputHex(displayValue(row.token))"
                @input="onPick(row.token, $event)"
              />
            </span>
            <input
              type="text"
              class="paint-drawer__hex-input"
              :class="{ 'paint-drawer__hex-input--invalid': invalidHex[row.token] }"
              :data-testid="`paint-hex-${row.token}`"
              :value="hexInputValue(row.token)"
              @input="onHexInput(row.token, $event)"
              @blur="onHexBlur(row.token)"
            />
            <span
              v-if="!row.paintable"
              class="paint-drawer__warn"
              :data-testid="`paint-warn-${row.token}`"
              title="此 Token 不在主题 paintable 范围内"
            >⚠</span>
          </div>
        </div>
        <p
          v-if="invalidHex[row.token]"
          class="paint-drawer__hex-error"
          :data-testid="`paint-hex-error-${row.token}`"
        >
          请输入合法 hex 色值（#RGB / #RRGGBB / #RRGGBBAA）
        </p>
      </template>
    </div>

    <div class="paint-drawer__footer" data-testid="paint-drawer-footer">
      <button
        type="button"
        class="paint-drawer__btn paint-drawer__btn--ghost"
        data-testid="paint-drawer-reset"
        @click="onReset"
      >
        重置默认值
      </button>
      <button
        type="button"
        class="paint-drawer__btn paint-drawer__btn--primary"
        data-testid="paint-drawer-apply"
        :disabled="!isDirty"
        @click="onApply"
      >
        应用
      </button>
    </div>
  </div>
</template>

<style scoped>
.paint-drawer {
  position: fixed;
  top: 48px;
  right: 0;
  bottom: 0;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  z-index: var(--z-dropdown);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: drawer-slide-in var(--duration-base) var(--ease-standard);
}

@keyframes drawer-slide-in {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.paint-drawer__header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
}

.paint-drawer__title {
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.paint-drawer__close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  font-size: 16px;
  padding: 4px;
  border-radius: var(--radius-base);
}

.paint-drawer__close:hover {
  background: var(--color-surface-overlay);
  color: var(--color-text-primary);
}

.paint-drawer__list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3);
}

.paint-drawer__empty {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  padding: var(--space-4) 0;
}

.paint-drawer__row {
  height: 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-base);
}

.paint-drawer__row:hover {
  background: var(--color-surface-overlay);
}

.paint-drawer__token-name {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.paint-drawer__value-line {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.paint-drawer__swatch {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  overflow: hidden;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
  display: inline-flex;
}

.paint-drawer__color-input {
  width: 200%;
  height: 200%;
  margin: -50%;
  border: none;
  padding: 0;
  cursor: pointer;
}

.paint-drawer__hex-input {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: 0 var(--space-1);
  width: 90px;
  height: 22px;
}

.paint-drawer__hex-input:focus {
  border-color: var(--color-border);
  background: var(--color-surface);
  outline: none;
}

.paint-drawer__hex-input--invalid,
.paint-drawer__hex-input--invalid:focus {
  border-color: var(--color-error);
}

.paint-drawer__hex-error {
  margin: 0;
  padding: 0 var(--space-2) var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-error);
}

.paint-drawer__warn {
  margin-left: auto;
  color: var(--color-warning);
  font-size: var(--font-size-sm);
  flex-shrink: 0;
  cursor: help;
}

.paint-drawer__footer {
  height: 56px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
  background: var(--color-surface);
}

.paint-drawer__btn {
  height: 32px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-base);
  font-size: var(--font-size-sm);
  cursor: pointer;
  border: 1px solid transparent;
}

.paint-drawer__btn--ghost {
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

.paint-drawer__btn--primary {
  background: var(--color-brand);
  border-color: var(--color-brand);
  color: var(--color-text-inverse);
}

.paint-drawer__btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
