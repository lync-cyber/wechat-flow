<script setup lang="ts">
import type { ThemeDefinition } from "@wechat-flow/contracts";
import { computed } from "vue";
import { useRouter } from "vue-router";

const props = withDefaults(
  defineProps<{
    theme: Pick<ThemeDefinition, "id" | "name" | "tokens">;
    isSelected: boolean;
    isPlaceholder?: boolean;
    description?: string;
    onSelect: (id: string) => void;
  }>(),
  {
    isPlaceholder: false,
    description: undefined,
  }
);

const router = useRouter();

const thumbnailColor = computed(
  () => props.theme.tokens?.["--color-brand"] ?? "var(--color-surface-sunken)"
);

function handleClick(): void {
  if (props.isPlaceholder) {
    router.push("/themes");
    return;
  }
  props.onSelect(props.theme.id);
}
</script>

<template>
  <div
    class="theme-card"
    :class="{
      'theme-card--selected': isSelected,
      'theme-card--placeholder': isPlaceholder,
    }"
    data-testid="theme-card"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
  >
    <div
      class="theme-card__thumbnail"
      :style="isPlaceholder ? undefined : { background: thumbnailColor }"
      data-testid="themecard-thumbnail"
    >
      <span v-if="isPlaceholder" class="theme-card__placeholder-text" data-testid="placeholder-text">
        更多主题即将上线
      </span>
    </div>
    <div class="theme-card__body">
      <span class="theme-card__check-icon" v-if="isSelected" data-testid="check-icon" aria-hidden="true">✓</span>
      <div class="theme-card__meta">
        <span class="theme-card__name">{{ theme.name }}</span>
        <span v-if="description" class="theme-card__description" data-testid="themecard-description">{{ description }}</span>
      </div>
    </div>
    <a
      v-if="isPlaceholder"
      href="/themes"
      class="theme-card__placeholder-link"
      data-testid="placeholder-link"
      @click.prevent="router.push('/themes')"
    />
  </div>
</template>

<style scoped>
.theme-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  overflow: hidden;
  position: relative;
}

.theme-card--selected {
  border: 2px solid var(--color-brand);
}

.theme-card--placeholder {
  opacity: 0.6;
}

.theme-card__thumbnail {
  height: 60px;
  background: var(--color-surface-sunken);
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-card__placeholder-text {
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-muted);
  text-align: center;
  padding: 0 8px;
}

.theme-card__body {
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.theme-card__meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.theme-card__description {
  font-size: 12px;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-card__check-icon {
  position: absolute;
  top: 4px;
  left: 4px;
  color: var(--color-brand);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.theme-card__name {
  font-size: 14px;
  font-weight: 500;
}

.theme-card__placeholder-link {
  position: absolute;
  inset: 0;
}
</style>
