export interface FallbackPayload {
  type: "fallback";
  reason: "timeout";
}

/** Returns a placeholder fallback payload for a timed-out plugin Worker. */
export function createTimeoutFallback(): FallbackPayload {
  return { type: "fallback", reason: "timeout" };
}
