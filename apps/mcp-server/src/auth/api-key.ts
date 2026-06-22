import { createHash, timingSafeEqual } from "node:crypto";

export interface ApiKeyRecord {
  scope: "user" | "admin";
}

export type ApiKeyStore = Map<string, ApiKeyRecord>;

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function verifyApiKey(raw: string | undefined, store: ApiKeyStore): ApiKeyRecord | null {
  if (!raw) return null;
  const inputBuf = Buffer.from(hashApiKey(raw), "hex");
  let matched: ApiKeyRecord | null = null;
  for (const [storedHash, record] of store) {
    const storedBuf = Buffer.from(storedHash, "hex");
    if (inputBuf.length === storedBuf.length && timingSafeEqual(inputBuf, storedBuf)) {
      matched = record;
    }
  }
  return matched;
}
