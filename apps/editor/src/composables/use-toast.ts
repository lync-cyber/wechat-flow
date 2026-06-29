import { ref } from "vue";

export interface Toast {
  id: number;
  type: "success" | "error" | "warning";
  message: string;
}

let nextId = 0;

const toasts = ref<Toast[]>([]);

export function useToast() {
  function pushToast(notification: {
    type: "success" | "error" | "warning";
    message: string;
  }): void {
    toasts.value.push({ id: nextId++, ...notification });
  }

  function dismissToast(id: number): void {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return { toasts, pushToast, dismissToast };
}
