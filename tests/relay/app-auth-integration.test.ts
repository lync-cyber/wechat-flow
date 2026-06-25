import { describe, expect, it } from "vitest";
import type { EditorSessionDeps } from "../../apps/relay/src/auth/editor-session.ts";
import { issueEditorSession } from "../../apps/relay/src/auth/editor-session.ts";
import type { ImageHostAdapter, UploadResult } from "../../apps/relay/src/image-host/types.ts";
import { createApp } from "../../apps/relay/src/index.ts";
import type { JobRecord, JobStore } from "../../apps/relay/src/job/types.ts";
import type { AuthMiddlewareDeps } from "../../apps/relay/src/middleware/auth.ts";

const TEST_SECRET_BYTES = new TextEncoder().encode("test-secret-32-bytes-minimum-len!!");

function makeMemorySessionStore() {
  const sessions = new Map<string, { revoked: boolean }>();
  return {
    save: async (sessionId: string) => {
      sessions.set(sessionId, { revoked: false });
    },
    isRevoked: async (sessionId: string) => {
      const s = sessions.get(sessionId);
      return s === undefined || s.revoked;
    },
    revoke: async (sessionId: string) => {
      sessions.set(sessionId, { revoked: true });
    },
  };
}

function makeEditorDeps(
  sessionStore: ReturnType<typeof makeMemorySessionStore>
): EditorSessionDeps {
  return {
    secret: TEST_SECRET_BYTES,
    clock: () => Date.now(),
    sessionStore,
    rateLimiter: { check: () => ({ allowed: true }) },
    verifyOAuthToken: async (provider) => ({ sub: `oauth:${provider}` }),
    allowedOrigins: ["https://editor.example.com"],
  };
}

function makeAuthDeps(sessionStore: ReturnType<typeof makeMemorySessionStore>): AuthMiddlewareDeps {
  return { secret: TEST_SECRET_BYTES, sessionStore, clock: () => Date.now() };
}

async function issueToken(editorDeps: EditorSessionDeps): Promise<string> {
  const session = await issueEditorSession(
    { bootstrap: "oauth", provider: "github", oauthToken: "token-int" },
    editorDeps
  );
  return session.sessionJwt;
}

function makeNoopImageAdapter(): ImageHostAdapter {
  return {
    name: "noop",
    upload: (_data, meta): Promise<UploadResult> =>
      Promise.resolve({ url: `https://cdn.test/${meta.filename}` }),
  };
}

function makeMemoryJobStore(): JobStore {
  const records = new Map<string, JobRecord>();
  return {
    async get(jobId) {
      return records.get(jobId) ?? null;
    },
    async upsert(record) {
      records.set(record.jobId, { ...record });
    },
    async findByIdempotency() {
      return null;
    },
  };
}

describe("createApp auth: images upload route is gated when auth deps are provided", () => {
  it("returns 401 for an unauthenticated upload request", async () => {
    const store = makeMemorySessionStore();
    const app = createApp({
      auth: makeAuthDeps(store),
      editorSession: makeEditorDeps(store),
      imagesAdapter: makeNoopImageAdapter(),
    });

    const res = await app.request("/api/v1/images/upload", { method: "POST" });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_UNAUTHORIZED");
  });

  it("passes auth for a valid editor JWT carrying the upload scope", async () => {
    const store = makeMemorySessionStore();
    const editorDeps = makeEditorDeps(store);
    const app = createApp({
      auth: makeAuthDeps(store),
      editorSession: editorDeps,
      imagesAdapter: makeNoopImageAdapter(),
    });

    const token = await issueToken(editorDeps);
    const res = await app.request("/api/v1/images/upload", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });

    // Auth passes (no body → 400 missing file), but never 401/403
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe("createApp auth: admin route requires the admin scope", () => {
  it("returns 401 when no token is supplied", async () => {
    const store = makeMemorySessionStore();
    const app = createApp({ auth: makeAuthDeps(store), editorSession: makeEditorDeps(store) });

    const res = await app.request("/api/v1/admin/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for an editor JWT that lacks the admin scope", async () => {
    const store = makeMemorySessionStore();
    const editorDeps = makeEditorDeps(store);
    const app = createApp({ auth: makeAuthDeps(store), editorSession: editorDeps });

    const token = await issueToken(editorDeps);
    const res = await app.request("/api/v1/admin/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_FORBIDDEN");
  });
});

describe("createApp auth (SR-B-003): jobs enqueue derives identity from the token, not the body", () => {
  it("returns 401 for an unauthenticated enqueue request", async () => {
    const store = makeMemorySessionStore();
    const app = createApp({
      auth: makeAuthDeps(store),
      editorSession: makeEditorDeps(store),
      jobsDeps: { store: makeMemoryJobStore(), enqueue: async () => "job-x" },
    });

    const res = await app.request("/api/v1/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "long-image-render", input: {}, apiKeyId: "attacker-key" }),
    });
    expect(res.status).toBe(401);
  });

  it("ignores a body-supplied apiKeyId and enqueues with the token subject", async () => {
    const store = makeMemorySessionStore();
    const editorDeps = makeEditorDeps(store);
    const enqueued: Array<{ apiKeyId: string }> = [];

    const app = createApp({
      auth: makeAuthDeps(store),
      editorSession: editorDeps,
      jobsDeps: {
        store: makeMemoryJobStore(),
        enqueue: async (_kind, _input, apiKeyId) => {
          enqueued.push({ apiKeyId });
          return "job-enqueued-1";
        },
      },
    });

    const token = await issueToken(editorDeps);
    const res = await app.request("/api/v1/jobs", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        kind: "long-image-render",
        input: { articleId: "a1" },
        apiKeyId: "attacker-key",
      }),
    });

    expect(res.status).toBe(200);
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0].apiKeyId).toBe("oauth:github");
    expect(enqueued[0].apiKeyId).not.toBe("attacker-key");
  });
});
