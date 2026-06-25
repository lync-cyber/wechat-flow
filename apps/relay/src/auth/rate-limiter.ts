import type { RateLimiter } from "./editor-session.ts";

export interface InMemoryRateLimiterOpts {
  windowMs?: number;
  max?: number;
}

/**
 * Fixed-window in-memory rate limiter keyed by an arbitrary identifier (e.g. client IP).
 * `max` requests are allowed per `windowMs`; the window resets lazily on first hit after expiry.
 */
export function createInMemoryRateLimiter(opts: InMemoryRateLimiterOpts = {}): RateLimiter {
  const windowMs = opts.windowMs ?? 60_000;
  const max = opts.max ?? 10;
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key: string, now: number): { allowed: boolean } {
      let bucket = buckets.get(key);
      if (!bucket || now >= bucket.resetAt) {
        bucket = { count: 0, resetAt: now + windowMs };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      return { allowed: bucket.count <= max };
    },
  };
}
