import { createBackup } from "@wechat-flow/core";
import { onUnmounted } from "vue";

export const BACKUP_INTERVAL_MS = 5 * 60 * 1000;

export interface UseAutoBackupOptions {
  getDocId: () => string;
  isDirty: () => boolean;
  intervalMs?: number;
  onBackedUp?: () => void;
}

export function useAutoBackup(opts: UseAutoBackupOptions): void {
  const interval = opts.intervalMs ?? BACKUP_INTERVAL_MS;

  const timer = setInterval(async () => {
    if (!opts.isDirty()) return;
    try {
      await createBackup(opts.getDocId());
      opts.onBackedUp?.();
    } catch {
      // Backup failure is non-fatal; will retry on next tick
    }
  }, interval);

  onUnmounted(() => {
    clearInterval(timer);
  });
}
