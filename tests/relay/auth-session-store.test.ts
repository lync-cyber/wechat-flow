import type { Redis } from "ioredis";
import { describe, expect, it } from "vitest";
import { createRedisSessionStore } from "../../apps/relay/src/auth/session-store.ts";

function makeFakeRedis(): Redis {
  const store = new Map<string, string>();
  return {
    async set(key: string, value: string) {
      store.set(key, value);
      return "OK";
    },
    async exists(key: string) {
      return store.has(key) ? 1 : 0;
    },
  } as unknown as Redis;
}

describe("createRedisSessionStore", () => {
  it("treats an unknown session as revoked (fail-closed)", async () => {
    const s = createRedisSessionStore(makeFakeRedis());
    expect(await s.isRevoked("unknown-session")).toBe(true);
  });

  it("treats a saved, non-revoked session as not revoked", async () => {
    const s = createRedisSessionStore(makeFakeRedis());
    await s.save("sid-1");
    expect(await s.isRevoked("sid-1")).toBe(false);
  });

  it("treats an explicitly revoked session as revoked", async () => {
    const s = createRedisSessionStore(makeFakeRedis());
    await s.save("sid-2");
    await s.revoke("sid-2");
    expect(await s.isRevoked("sid-2")).toBe(true);
  });
});
