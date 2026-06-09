<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  direction: "vertical";
  minLeft: number;
  maxLeft: number;
  defaultLeft: number;
  disabled?: boolean;
  invert?: boolean;
  onResize: (leftPx: number) => void;
}>();

type SplitterState = "idle" | "hover" | "dragging" | "disabled";

const state = ref<SplitterState>(props.disabled ? "disabled" : "idle");
let dragStartX = 0;
let dragStartLeft = 0;

function clamp(value: number): number {
  return Math.min(props.maxLeft, Math.max(props.minLeft, value));
}

function onPointerDown(e: PointerEvent): void {
  if (props.disabled) return;
  e.preventDefault();
  state.value = "dragging";
  dragStartX = e.clientX;
  dragStartLeft = props.defaultLeft;

  document.body.style.userSelect = "none";
  document.body.style.cursor = "col-resize";

  const onMove = (moveEvent: PointerEvent) => {
    const delta = moveEvent.clientX - dragStartX;
    // invert for right-side panels: dragging right shrinks the panel
    const newWidth = clamp(dragStartLeft + (props.invert ? -delta : delta));
    props.onResize(newWidth);
  };

  const onUp = () => {
    state.value = "idle";
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}

function onMouseEnter(): void {
  if (!props.disabled && state.value === "idle") {
    state.value = "hover";
  }
}

function onMouseLeave(): void {
  if (state.value === "hover") {
    state.value = "idle";
  }
}
</script>

<template>
  <div
    class="splitter"
    :class="{
      'splitter--hover': state === 'hover',
      'splitter--dragging': state === 'dragging',
      'splitter--disabled': state === 'disabled',
    }"
    data-testid="splitter"
    role="separator"
    :aria-disabled="props.disabled"
    @pointerdown="onPointerDown"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  />
</template>

<style scoped>
.splitter {
  width: 4px;
  background: var(--color-border-subtle);
  cursor: col-resize;
  flex-shrink: 0;
  align-self: stretch;
  position: relative;
  z-index: var(--z-splitter);
  /* transparent hit area */
  padding: 0 2px;
  box-sizing: content-box;
  transition: background var(--duration-base) var(--ease-standard),
    width var(--duration-base) var(--ease-standard);
}

.splitter--hover {
  width: 3px;
  background: var(--color-border);
}

.splitter--dragging {
  width: 3px;
  background: var(--color-brand);
}

.splitter--disabled {
  background: var(--color-surface-overlay);
  cursor: default;
  pointer-events: none;
}
</style>
