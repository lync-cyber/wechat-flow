import type { FallbackPayload } from "../runtime/violation-result.ts";

export type { FallbackPayload };

/** Returns a placeholder fallback payload for a timed-out plugin Worker. */
export function createTimeoutFallback(): FallbackPayload {
  return { type: "fallback", reason: "timeout" };
}
