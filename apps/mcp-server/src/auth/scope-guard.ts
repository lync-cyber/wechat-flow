import type { ApiKeyRecord } from "./api-key.ts";

export type AuthError = { code: "E_AUTH_REQUIRED" | "E_PERMISSION_DENIED" };

export function guardUserScope(keyRecord: ApiKeyRecord | null): AuthError | null {
  if (keyRecord === null) {
    return { code: "E_AUTH_REQUIRED" };
  }
  if (keyRecord.scope === "user") {
    return null;
  }
  return { code: "E_PERMISSION_DENIED" };
}
