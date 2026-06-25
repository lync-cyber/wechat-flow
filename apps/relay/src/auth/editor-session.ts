import { SignJWT, jwtVerify } from "jose";

/**
 * JWT issuance and refresh for editor sessions.
 */
export interface SessionStore {
  save(sessionId: string): Promise<void>;
  isRevoked(sessionId: string): Promise<boolean>;
  revoke(sessionId: string): Promise<void>;
}

export interface RateLimiter {
  check(key: string, now: number): { allowed: boolean };
}

export type OAuthProvider = "github" | "wechat-mp" | "custom";

export interface OAuthClaims {
  sub: string;
}

export interface EditorSessionDeps {
  secret: Uint8Array;
  clock: () => number;
  sessionStore: SessionStore;
  rateLimiter: RateLimiter;
  verifyOAuthToken: (provider: OAuthProvider, token: string) => Promise<OAuthClaims | null>;
  allowedOrigins: string[];
}

export class EditorAuthError extends Error {}

export type IssueEditorSessionInput =
  | { bootstrap: "oauth"; provider: OAuthProvider; oauthToken: string }
  | { bootstrap: "anonymous"; deviceFingerprint: string; captchaToken?: string };

export interface EditorSessionResult {
  sessionJwt: string;
  expiresAt: string;
  refreshUntil: string;
  scope: string;
  sessionId: string;
}

const SCOPE = "user,render,upload";
const SESSION_DURATION_MS = 15 * 60 * 1000;
const REFRESH_WINDOW_MS = 60 * 1000;

async function resolveSubject(
  input: IssueEditorSessionInput,
  deps: EditorSessionDeps
): Promise<string> {
  if (input.bootstrap === "oauth") {
    let claims: OAuthClaims | null;
    try {
      claims = await deps.verifyOAuthToken(input.provider, input.oauthToken);
    } catch {
      throw new EditorAuthError("OAuth token verification failed.");
    }
    if (!claims) {
      throw new EditorAuthError("OAuth token verification failed.");
    }
    return claims.sub;
  }
  return `anon:${input.deviceFingerprint}`;
}

async function signSession(
  sub: string,
  sessionId: string,
  nowMs: number,
  secret: Uint8Array
): Promise<{ jwt: string; expMs: number }> {
  const expMs = nowMs + SESSION_DURATION_MS;
  const jwt = await new SignJWT({ scope: SCOPE, sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("editor")
    .setSubject(sub)
    .setIssuedAt(Math.floor(nowMs / 1000))
    .setExpirationTime(Math.floor(expMs / 1000))
    .sign(secret);
  return { jwt, expMs };
}

export async function issueEditorSession(
  input: IssueEditorSessionInput,
  deps: EditorSessionDeps
): Promise<EditorSessionResult> {
  const nowMs = deps.clock();
  const sessionId = crypto.randomUUID();
  const sub = await resolveSubject(input, deps);

  const { jwt, expMs } = await signSession(sub, sessionId, nowMs, deps.secret);
  await deps.sessionStore.save(sessionId);

  return {
    sessionJwt: jwt,
    expiresAt: new Date(expMs).toISOString(),
    refreshUntil: new Date(expMs).toISOString(),
    scope: SCOPE,
    sessionId,
  };
}

export async function refreshEditorSession(
  token: string,
  deps: EditorSessionDeps
): Promise<EditorSessionResult> {
  const nowMs = deps.clock();

  let payload: { iss?: string; sub?: string; sessionId?: unknown; exp?: number };
  try {
    const result = await jwtVerify(token, deps.secret, {
      currentDate: new Date(nowMs),
    });
    payload = result.payload as typeof payload;
  } catch {
    throw new Error("Invalid or expired session JWT.");
  }

  if (payload.iss !== "editor") {
    throw new Error("Token is not an editor session.");
  }

  const sessionId = typeof payload.sessionId === "string" ? payload.sessionId : undefined;
  if (!sessionId) {
    throw new Error("Missing sessionId in token.");
  }

  const revoked = await deps.sessionStore.isRevoked(sessionId);
  if (revoked) {
    throw new Error("Session has been revoked.");
  }

  const currentExpMs = typeof payload.exp === "number" ? payload.exp * 1000 : undefined;
  if (currentExpMs === undefined) {
    throw new Error("Missing exp claim in token.");
  }
  if (currentExpMs - nowMs > REFRESH_WINDOW_MS) {
    throw new Error("Refresh is only permitted within the refresh window before expiry.");
  }

  const sub = payload.sub ?? "unknown";
  const newSessionId = crypto.randomUUID();
  const { jwt, expMs } = await signSession(sub, newSessionId, nowMs, deps.secret);
  await deps.sessionStore.save(newSessionId);

  return {
    sessionJwt: jwt,
    expiresAt: new Date(expMs).toISOString(),
    refreshUntil: new Date(expMs).toISOString(),
    scope: SCOPE,
    sessionId: newSessionId,
  };
}
