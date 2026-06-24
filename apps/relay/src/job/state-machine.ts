import type { JobError, JobRecord, JobState } from "./types.ts";

const ALLOWED_TRANSITIONS: Record<JobState, JobState[]> = {
  pending: ["running"],
  running: ["succeeded", "failed"],
  succeeded: [],
  failed: [],
};

export function transitionState(
  record: JobRecord,
  to: JobState,
  payload?: { result?: unknown; error?: JobError }
): JobRecord {
  const allowed = ALLOWED_TRANSITIONS[record.state];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid state transition: ${record.state} → ${to}`);
  }

  const updatedAt = new Date().toISOString();
  const updated: JobRecord = { ...record, state: to, updatedAt };

  if (to === "succeeded") {
    updated.progress = 1;
    updated.result = payload?.result ?? null;
  } else if (to === "failed") {
    updated.error = payload?.error ?? null;
  }

  return updated;
}
