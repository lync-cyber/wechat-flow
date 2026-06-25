<script setup lang="ts">
import { useToast } from "../../composables/use-toast.ts";
import Toast from "./Toast.vue";

const { toasts, dismissToast } = useToast();
</script>

<template>
  <Teleport to="body">
    <div class="toast-host" data-testid="toast-host" aria-live="polite">
      <Toast
        v-for="t in toasts"
        :key="t.id"
        :type="t.type"
        :message="t.message"
        :on-close="() => dismissToast(t.id)"
      />
    </div>
  </Teleport>
</template>

<style scoped>
.toast-host {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: var(--z-toast, 9000);
  pointer-events: none;
}

.toast-host > :deep(*) {
  pointer-events: auto;
}
</style>
