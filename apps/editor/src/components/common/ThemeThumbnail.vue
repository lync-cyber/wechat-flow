<script setup lang="ts">
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false });
</script>

<template>
  <div
    class="theme-thumbnail"
    :class="{ 'theme-thumbnail--compact': compact }"
    data-testid="theme-thumbnail"
    aria-hidden="true"
  >
    <div class="theme-thumbnail__title" />
    <div class="theme-thumbnail__line" />
    <div class="theme-thumbnail__line theme-thumbnail__line--extra" />
    <div class="theme-thumbnail__line theme-thumbnail__line--short" />
    <div class="theme-thumbnail__quote">
      <div class="theme-thumbnail__line" />
    </div>
  </div>
</template>

<style scoped>
.theme-thumbnail {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--thumbnail-bg, var(--color-surface));
  overflow: hidden;
}

.theme-thumbnail__title {
  width: 60%;
  height: 12px;
  border-radius: 3px;
  background: var(--card-accent, var(--color-brand));
}

.theme-thumbnail__line {
  width: 100%;
  height: 8px;
  border-radius: 3px;
  background: var(--thumbnail-border, var(--color-border));
}

.theme-thumbnail__line--short {
  width: 70%;
}

.theme-thumbnail__quote {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  margin-top: 4px;
  border-left: 3px solid var(--card-accent, var(--color-brand));
  background: var(--thumbnail-surface, var(--color-surface-sunken));
}

.theme-thumbnail__quote .theme-thumbnail__line {
  margin: 0;
}

.theme-thumbnail--compact {
  gap: 4px;
  padding: 8px 10px;
}

.theme-thumbnail--compact .theme-thumbnail__title {
  height: 7px;
  width: 55%;
}

.theme-thumbnail--compact .theme-thumbnail__line {
  height: 5px;
}

.theme-thumbnail--compact .theme-thumbnail__line--extra {
  display: none;
}

.theme-thumbnail--compact .theme-thumbnail__quote {
  padding: 3px 6px;
  margin-top: 2px;
}
</style>
