export interface ViolationResult {
  type: "fallback";
  reason: "timeout";
}

export type FallbackPayload = ViolationResult;
