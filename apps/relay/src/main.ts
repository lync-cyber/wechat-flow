import { serve } from "@hono/node-server";
import { Redis } from "ioredis";
import { type ApiKeyEntry, createAdminApiKeysApp } from "./admin/api-keys.ts";
import { createAdminGuard } from "./auth/admin-guard.ts";
import { loadEditorJwtSecret } from "./auth/editor-session-config.ts";
import type { EditorSessionDeps, OAuthProvider } from "./auth/editor-session.ts";
import { createInMemoryRateLimiter } from "./auth/rate-limiter.ts";
import { createRedisSessionStore } from "./auth/session-store.ts";
import { loadImageHostConfig } from "./credentials/store.ts";
import { createAdapterFromConfig } from "./image-host/factory.ts";
import { createApp } from "./index.ts";
import { createJobsRuntime } from "./job/runtime.ts";
import type { AuthMiddlewareDeps } from "./middleware/auth.ts";

const imagesAdapter = createAdapterFromConfig(loadImageHostConfig(process.env));

const redisUrl = new URL(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
const connection = { host: redisUrl.hostname, port: Number(redisUrl.port || 6379) };
const redis = new Redis({ ...connection, maxRetriesPerRequest: null });
const { jobsDeps } = createJobsRuntime({ redis, connection });

const secret = loadEditorJwtSecret(process.env);
const clock = () => Date.now();
const sessionStore = createRedisSessionStore(redis);

const auth: AuthMiddlewareDeps = { secret, sessionStore, clock };

const allowedOrigins = (process.env.EDITOR_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const editorSession: EditorSessionDeps = {
  secret,
  clock,
  sessionStore,
  rateLimiter: createInMemoryRateLimiter(),
  verifyOAuthToken: async (_provider: OAuthProvider, _token: string) => null,
  allowedOrigins,
};

// cataforge: wiring-placeholder — adminKeyStore is in-memory; wire E-010 DB persistence before production.
// Shared store injected into both adminApp (writes) and lookupAdminKey (reads) to guarantee consistency.
const adminKeyStore = new Map<string, ApiKeyEntry>();

/**
 * Layer 1 Bearer lookup: receives the already-hashed token (HMAC-SHA256, from admin-guard)
 * and finds a matching admin-scoped key. Fail-closed: returns null when store is empty or no match.
 */
function lookupAdminKey(hash: string): string | null {
  for (const entry of adminKeyStore.values()) {
    if (entry.apiKeyHash === hash && entry.scope === "admin") {
      return entry.id;
    }
  }
  return null;
}

const adminGuard = createAdminGuard({
  auditLog: (entry) => console.log("[admin-audit]", entry),
  lookupAdminKey,
});
const adminApp = createAdminApiKeysApp({ guard: adminGuard, store: adminKeyStore });

const app = createApp({
  imagesAdapter,
  jobsDeps,
  auth,
  editorSession,
  adminDeps: { app: adminApp },
});

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`relay listening on http://localhost:${info.port}`);
});
