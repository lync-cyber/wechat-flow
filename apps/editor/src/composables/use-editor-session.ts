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

export function useEditorSession(options: EditorSessionOptions = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  let cachedJwt: string | undefined;
  let fetchPromise: Promise<string | undefined> | null = null;

  async function getSessionToken(): Promise<string | undefined> {
    if (cachedJwt) return cachedJwt;
    if (fetchPromise) return fetchPromise;

    fetchPromise = (async () => {
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
        return cachedJwt;
      } catch {
        return undefined;
      } finally {
        fetchPromise = null;
      }
    })();

    return fetchPromise;
  }

  return { getSessionToken };
}
