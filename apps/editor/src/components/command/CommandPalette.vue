<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { CommandDefinition } from "../../lib/command-registry.ts";
import { filterCommands } from "../../lib/command-registry.ts";

const props = defineProps<{
  isOpen: boolean;
  commands: CommandDefinition[];
  onClose: () => void;
  onExecute: (cmd: CommandDefinition) => void;
}>();

const query = ref("");
const activeIndex = ref(0);

const filtered = computed(() => filterCommands(props.commands, query.value));

const groups = computed(() => {
  const map = new Map<string, CommandDefinition[]>();
  for (const cmd of filtered.value) {
    const list = map.get(cmd.group) ?? [];
    list.push(cmd);
    map.set(cmd.group, list);
  }
  return map;
});

watch(
  () => props.isOpen,
  (open) => {
    if (!open) {
      query.value = "";
      activeIndex.value = 0;
    }
  }
);

watch(query, () => {
  activeIndex.value = 0;
});

function highlightText(text: string, q: string): { text: string; highlight: boolean }[] {
  if (!q) return [{ text, highlight: false }];
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return [{ text, highlight: false }];
  return [
    { text: text.slice(0, idx), highlight: false },
    { text: text.slice(idx, idx + q.length), highlight: true },
    { text: text.slice(idx + q.length), highlight: false },
  ].filter((p) => p.text.length > 0);
}

function execute(cmd: CommandDefinition): void {
  props.onExecute(cmd);
  props.onClose();
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === "Escape") {
    e.preventDefault();
    props.onClose();
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeIndex.value = (activeIndex.value + 1) % Math.max(filtered.value.length, 1);
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    const len = Math.max(filtered.value.length, 1);
    activeIndex.value = (activeIndex.value - 1 + len) % len;
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    const cmd = filtered.value[activeIndex.value];
    if (cmd) execute(cmd);
    return;
  }
}
</script>

<template>
  <template v-if="isOpen">
    <div
      class="command-palette-overlay"
      data-testid="command-palette-overlay"
      @click="onClose"
    />
    <div
      class="command-palette command-palette--open"
      data-testid="command-palette"
      role="dialog"
      aria-modal="true"
      aria-label="命令面板"
      @keydown="onKeyDown"
    >
        <!-- Search input -->
        <div class="command-palette__search">
          <span class="command-palette__search-icon" aria-hidden="true">⌕</span>
          <input
            ref="inputEl"
            v-model="query"
            class="command-palette__input"
            data-testid="command-search-input"
            type="text"
            placeholder="搜索动作…"
            autocomplete="off"
            autofocus
          />
        </div>

        <!-- Command list -->
        <div class="command-palette__list" role="listbox">
          <template v-if="filtered.length > 0">
            <template v-for="[group, cmds] in groups" :key="group">
              <div
                class="command-palette__group-title"
                :data-testid="`group-title-${group}`"
              >{{ group }}</div>
              <div
                v-for="(cmd, gi) in cmds"
                :key="cmd.id"
                :data-testid="`command-item-${cmd.id}`"
                :data-group="group"
                class="command-palette__item"
                :class="{ 'command-palette__item--active': filtered.indexOf(cmd) === activeIndex }"
                role="option"
                :aria-selected="filtered.indexOf(cmd) === activeIndex"
                @click="execute(cmd)"
                @mouseenter="activeIndex = filtered.indexOf(cmd)"
              >
                <span class="command-palette__item-label">
                  <template v-for="(part, pi) in highlightText(cmd.label, query)" :key="pi">
                    <mark v-if="part.highlight" class="command-palette__highlight">{{ part.text }}</mark>
                    <span v-else>{{ part.text }}</span>
                  </template>
                </span>
                <kbd v-if="cmd.shortcut" class="command-palette__shortcut">{{ cmd.shortcut }}</kbd>
              </div>
            </template>
          </template>
          <div
            v-else
            class="command-palette__empty"
            data-testid="command-empty"
          >没有匹配的动作</div>
        </div>

        <!-- Footer -->
        <div class="command-palette__footer" data-testid="command-palette-footer">
          <span>↑↓ 导航</span>
          <span>↵ 执行</span>
          <span>Esc 关闭</span>
        </div>
      </div>
  </template>
</template>

<style scoped>
.command-palette-overlay {
  position: fixed;
  inset: 0;
  background: rgba(28, 25, 23, 0.4);
  z-index: calc(var(--z-command) - 1);
  animation: fade-in var(--duration-slow) var(--ease-decelerate);
}

.command-palette {
  position: fixed;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  width: 560px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  z-index: var(--z-command);
  overflow: hidden;
  animation: palette-in var(--duration-slow) var(--ease-decelerate);
}

@keyframes palette-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-8px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.command-palette__search {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0 var(--space-4);
  height: 48px;
  border-bottom: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
}

.command-palette__search-icon {
  color: var(--color-text-muted);
  font-size: 18px;
}

.command-palette__input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
}

.command-palette__input::placeholder {
  color: var(--color-text-muted);
}

.command-palette__list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) 0;
}

.command-palette__group-title {
  padding: var(--space-2) var(--space-4) var(--space-1);
  font-size: 10px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.command-palette__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  gap: var(--space-3);
}

.command-palette__item--active {
  background: var(--color-surface-overlay);
}

.command-palette__item-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-palette__highlight {
  background: transparent;
  color: var(--color-brand);
  font-weight: var(--font-weight-bold);
  text-decoration: none;
}

.command-palette__shortcut {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  padding: 1px 5px;
  font-family: var(--font-mono);
  flex-shrink: 0;
}

.command-palette__empty {
  text-align: center;
  padding: var(--space-8) var(--space-4);
  font-size: 14px;
  color: var(--color-text-muted);
}

.command-palette__footer {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  flex-shrink: 0;
}
</style>
