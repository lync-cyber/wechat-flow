import type { Redis } from "ioredis";
import type { SessionStore } from "./editor-session.ts";

const SESSION_TTL_SECONDS = 24 * 60 * 60;

const activeKey = (sessionId: string) => `session:active:${sessionId}`;
const revokedKey = (sessionId: string) => `session:revoked:${sessionId}`;

/**
 * Redis-backed session store. A session is valid only while its active marker
 * exists and no revoked marker is present, so unknown or expired sessions
 * resolve as revoked (fail-closed).
 */
export function createRedisSessionStore(redis: Redis): SessionStore {
  return {
    async save(sessionId) {
      await redis.set(activeKey(sessionId), "1", "EX", SESSION_TTL_SECONDS);
    },
    async isRevoked(sessionId) {
      const [active, revoked] = await Promise.all([
        redis.exists(activeKey(sessionId)),
        redis.exists(revokedKey(sessionId)),
      ]);
      return active !== 1 || revoked === 1;
    },
    async revoke(sessionId) {
      await redis.set(revokedKey(sessionId), "1", "EX", SESSION_TTL_SECONDS);
    },
  };
}
