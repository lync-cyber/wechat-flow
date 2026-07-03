<script setup lang="ts">
import type { TokenDictionary } from "@wechat-flow/contracts";
import { derivePalette } from "@wechat-flow/palette";
import { computed, ref, watch } from "vue";
import BaseModal from "../common/BaseModal.vue";

const props = defineProps<{
  isOpen: boolean;
  currentBaseColor?: string;
  onApply: (baseColor: string, derivedTokens: TokenDictionary) => void;
  onCancel: () => void;
}>();

const HEX_PATTERN = /^#?[0-9a-fA-F]{3,8}$/;
const DERIVE_DEBOUNCE_MS = 300;

function normalizeHex(value: string): string {
  return value.startsWith("#") ? value : `#${value}`;
}

const hexInput = ref(props.currentBaseColor ?? "");
const lastValidHex = ref(props.currentBaseColor ?? "");
const isHexInvalid = ref(false);
const derivedTokens = ref<TokenDictionary>({});
const isApplying = ref(false);

let deriveTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleDerive(hex: string): void {
  if (deriveTimer !== undefined) clearTimeout(deriveTimer);
  deriveTimer = setTimeout(() => {
    derivedTokens.value = derivePalette({ primary: normalizeHex(hex) });
  }, DERIVE_DEBOUNCE_MS);
}

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    hexInput.value = props.currentBaseColor ?? "";
    lastValidHex.value = props.currentBaseColor ?? "";
    isHexInvalid.value = false;
    derivedTokens.value = props.currentBaseColor
      ? derivePalette({ primary: normalizeHex(props.currentBaseColor) })
      : {};
  }
);

function onHexInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  hexInput.value = value;
  if (value === "") {
    isHexInvalid.value = false;
    derivedTokens.value = {};
    return;
  }
  if (!HEX_PATTERN.test(value)) {
    isHexInvalid.value = true;
    return;
  }
  isHexInvalid.value = false;
  lastValidHex.value = value;
  scheduleDerive(value);
}

function onColorPick(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  hexInput.value = value;
  isHexInvalid.value = false;
  lastValidHex.value = value;
  scheduleDerive(value);
}

function onHexBlur(): void {
  if (isHexInvalid.value) {
    hexInput.value = lastValidHex.value;
    isHexInvalid.value = false;
  }
}

const canApply = computed(() => hexInput.value !== "" && !isHexInvalid.value);

const TOKEN_GROUPS: { label: string; test: (key: string) => boolean }[] = [
  { label: "品牌色", test: (k) => k.startsWith("--color-brand") },
  { label: "表面色", test: (k) => k.startsWith("--color-surface") },
  { label: "边框色", test: (k) => k.startsWith("--color-border") },
  { label: "文字色", test: (k) => k.startsWith("--color-text") },
  { label: "功能色", test: (k) => k.startsWith("--color-status") },
];

const groupedTokens = computed(() => {
  const entries = Object.entries(derivedTokens.value);
  const groups: { label: string; tokens: [string, string][] }[] = TOKEN_GROUPS.map((g) => ({
    label: g.label,
    tokens: [],
  }));
  const other: [string, string][] = [];

  for (const entry of entries) {
    const [key] = entry;
    const groupIndex = TOKEN_GROUPS.findIndex((g) => g.test(key));
    if (groupIndex === -1) {
      other.push(entry);
    } else {
      groups[groupIndex].tokens.push(entry);
    }
  }

  if (other.length > 0) {
    groups.push({ label: "其他", tokens: other });
  }

  return groups.filter((g) => g.tokens.length > 0);
});

function onApplyClick(): void {
  if (!canApply.value) return;
  isApplying.value = true;
  props.onApply(normalizeHex(hexInput.value), derivedTokens.value);
  isApplying.value = false;
}
</script>

<template>
  <BaseModal
    :is-open="isOpen"
    title="调色板派生"
    variant="form"
    size="md"
    :on-close="onCancel"
  >
    <div data-testid="base-color-derive-modal" class="color-derive-modal">
      <div
        class="color-derive-modal__content"
        :style="{ opacity: isApplying ? 0.6 : 1 }"
      >
        <div class="color-derive-modal__base-row">
          <input
            type="color"
            class="color-derive-modal__swatch"
            data-testid="derive-color-swatch"
            :value="!isHexInvalid && hexInput ? normalizeHex(hexInput) : '#000000'"
            @input="onColorPick"
          />
          <div class="color-derive-modal__hex-col">
            <input
              type="text"
              class="color-derive-modal__hex-input"
              data-testid="derive-hex-input"
              :class="{ 'color-derive-modal__hex-input--invalid': isHexInvalid }"
              placeholder="#RRGGBB"
              :value="hexInput"
              @input="onHexInput"
              @blur="onHexBlur"
            />
            <p class="color-derive-modal__hint">输入主色 hex 值，实时预览派生 token</p>
            <p
              v-if="isHexInvalid"
              class="color-derive-modal__error"
              data-testid="derive-hex-error"
            >
              请输入合法 hex 色值（#RGB / #RRGGBB / #RRGGBBAA）
            </p>
          </div>
        </div>

        <div class="color-derive-modal__matrix" data-testid="derive-token-matrix">
          <div v-if="groupedTokens.length === 0" class="color-derive-modal__placeholder-group">
            <div
              v-for="n in 5"
              :key="n"
              class="color-derive-modal__swatch-block color-derive-modal__swatch-block--placeholder"
            />
          </div>
          <div
            v-for="group in groupedTokens"
            :key="group.label"
            class="color-derive-modal__group"
            :data-testid="`derive-group-${group.label}`"
          >
            <h4 class="color-derive-modal__group-title">{{ group.label }}</h4>
            <div class="color-derive-modal__group-tokens">
              <div
                v-for="[tokenName, tokenValue] in group.tokens"
                :key="tokenName"
                class="color-derive-modal__token"
                :data-testid="`derive-token-${tokenName}`"
              >
                <div
                  class="color-derive-modal__swatch-block"
                  :style="{ background: tokenValue }"
                />
                <span class="color-derive-modal__token-name">{{ tokenName }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="color-derive-modal__btn color-derive-modal__btn--ghost"
        data-testid="derive-cancel-btn"
        @click="onCancel"
      >
        取消
      </button>
      <button
        type="button"
        class="color-derive-modal__btn color-derive-modal__btn--primary"
        data-testid="derive-apply-btn"
        :disabled="!canApply || isApplying"
        @click="onApplyClick"
      >
        {{ isApplying ? "应用中…" : "应用到当前主题" }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.color-derive-modal {
  display: flex;
  flex-direction: column;
}

.color-derive-modal__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.color-derive-modal__base-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  height: 64px;
}

.color-derive-modal__swatch {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

.color-derive-modal__hex-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
}

.color-derive-modal__hex-input {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  height: 32px;
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  color: var(--color-text-primary);
  background: var(--color-surface);
}

.color-derive-modal__hex-input--invalid {
  border-color: var(--color-error);
}

.color-derive-modal__hint {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.color-derive-modal__error {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-error);
}

.color-derive-modal__matrix {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.color-derive-modal__group-title {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.color-derive-modal__group-tokens {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.color-derive-modal__placeholder-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.color-derive-modal__token {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  width: 56px;
}

.color-derive-modal__swatch-block {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-subtle);
}

.color-derive-modal__swatch-block--placeholder {
  background: var(--color-surface-sunken);
}

.color-derive-modal__token-name {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--color-text-muted);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.color-derive-modal__btn {
  height: 32px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-base);
  font-size: var(--font-size-sm);
  cursor: pointer;
  border: 1px solid transparent;
}

.color-derive-modal__btn--ghost {
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

.color-derive-modal__btn--primary {
  background: var(--color-brand);
  border-color: var(--color-brand);
  color: var(--color-text-inverse);
}

.color-derive-modal__btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
