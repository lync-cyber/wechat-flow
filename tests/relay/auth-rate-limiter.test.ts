import { describe, expect, it } from "vitest";
import { createInMemoryRateLimiter } from "../../apps/relay/src/auth/rate-limiter.ts";

describe("createInMemoryRateLimiter", () => {
  it("allows up to max requests within the window then rejects", () => {
    const rl = createInMemoryRateLimiter({ windowMs: 60_000, max: 3 });
    const now = 1000;
    expect(rl.check("ip", now).allowed).toBe(true);
    expect(rl.check("ip", now).allowed).toBe(true);
    expect(rl.check("ip", now).allowed).toBe(true);
    expect(rl.check("ip", now).allowed).toBe(false);
  });

  it("resets the bucket once the window elapses", () => {
    const rl = createInMemoryRateLimiter({ windowMs: 1000, max: 1 });
    expect(rl.check("ip", 0).allowed).toBe(true);
    expect(rl.check("ip", 500).allowed).toBe(false);
    expect(rl.check("ip", 1000).allowed).toBe(true);
  });

  it("tracks distinct keys independently", () => {
    const rl = createInMemoryRateLimiter({ windowMs: 60_000, max: 1 });
    expect(rl.check("a", 0).allowed).toBe(true);
    expect(rl.check("a", 0).allowed).toBe(false);
    expect(rl.check("b", 0).allowed).toBe(true);
  });

  it("defaults to 10 requests per 60s window", () => {
    const rl = createInMemoryRateLimiter();
    for (let i = 0; i < 10; i++) {
      expect(rl.check("ip", 0).allowed).toBe(true);
    }
    expect(rl.check("ip", 0).allowed).toBe(false);
  });
});
