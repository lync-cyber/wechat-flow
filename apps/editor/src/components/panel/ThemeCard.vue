<script setup lang="ts">
import type { ThemeDefinition } from "@wechat-flow/contracts";
import { useRouter } from "vue-router";

const props = withDefaults(
  defineProps<{
    theme: Pick<ThemeDefinition, "id" | "name" | "tokens">;
    isSelected: boolean;
    isPlaceholder?: boolean;
    onSelect: (id: string) => void;
  }>(),
  {
    isPlaceholder: false,
  }
);

const router = useRouter();

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
    <div class="theme-card__thumbnail">
      <span v-if="isPlaceholder" class="theme-card__placeholder-text" data-testid="placeholder-text">
        更多主题即将上线
      </span>
    </div>
    <div class="theme-card__body">
      <span class="theme-card__check-icon" v-if="isSelected" data-testid="check-icon" aria-hidden="true">✓</span>
      <span class="theme-card__name">{{ theme.name }}</span>
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
  align-items: center;
  gap: 4px;
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
