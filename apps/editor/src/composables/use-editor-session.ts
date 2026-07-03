const FINGERPRINT_KEY = "wf_device_fp";

function getOrCreateFingerprint(): string {
  try {
    const stored = localStorage.getItem(FINGERPRINT_KEY);
    if (stored && stored.length >= 16) return stored;
    const fp = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    localStorage.setItem(FINGERPRINT_KEY, fp);
    return fp;
  } catch {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
}

interface SessionResponse {
  sessionJwt: string;
  expiresAt: string;
  refreshUntil: string;
  scope: string[];
  sessionId: string;
}

interface EditorSessionOptions {
  fetchImpl?: typeof fetch;
}

const REFRESH_WINDOW_MS = 60_000;

export function useEditorSession(options: EditorSessionOptions = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  let cachedJwt: string | undefined;
  let cachedExpiresAt: number | undefined;
  let fetchPromise: Promise<string | undefined> | null = null;

  async function bootstrapAnonymous(): Promise<string | undefined> {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
      const fingerprint = getOrCreateFingerprint();
      const res = await fetchImpl("/api/v1/editor/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-editor-origin": origin,
        },
        body: JSON.stringify({ bootstrap: "anonymous", deviceFingerprint: fingerprint }),
      });
      if (!res.ok) return undefined;
      const data = (await res.json()) as SessionResponse;
      cachedJwt = data.sessionJwt;
      cachedExpiresAt = new Date(data.expiresAt).getTime();
      return cachedJwt;
    } catch {
      return undefined;
    }
  }

  async function refresh(): Promise<string | undefined> {
    if (!cachedJwt) return bootstrapAnonymous();
    try {
      const res = await fetchImpl("/api/v1/editor/session/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cachedJwt}`,
        },
      });
      if (!res.ok) {
        cachedJwt = undefined;
        cachedExpiresAt = undefined;
        return bootstrapAnonymous();
      }
      const data = (await res.json()) as SessionResponse;
      cachedJwt = data.sessionJwt;
      cachedExpiresAt = new Date(data.expiresAt).getTime();
      return cachedJwt;
    } catch {
      cachedJwt = undefined;
      cachedExpiresAt = undefined;
      return bootstrapAnonymous();
    }
  }

  async function getSessionToken(): Promise<string | undefined> {
    if (fetchPromise) return fetchPromise;

    if (cachedJwt && cachedExpiresAt !== undefined) {
      if (Date.now() < cachedExpiresAt - REFRESH_WINDOW_MS) {
        return cachedJwt;
      }
      fetchPromise = refresh().finally(() => {
        fetchPromise = null;
      });
      return fetchPromise;
    }

    fetchPromise = bootstrapAnonymous().finally(() => {
      fetchPromise = null;
    });

    return fetchPromise;
  }

  return { getSessionToken };
}
