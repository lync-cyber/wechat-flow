export interface ViolationResult {
  type: "fallback";
  reason: "timeout";
}

/**
 * Detects Worker timeout violations.
 * Returns a ViolationResult when the worker has exceeded the allowed duration.
 */
export function detectTimeout(
  startedAt: number,
  now: number,
  limitMs: number
): ViolationResult | null {
  const elapsed = now - startedAt;
  if (elapsed > limitMs) {
    return { type: "fallback", reason: "timeout" };
  }
  return null;
}
