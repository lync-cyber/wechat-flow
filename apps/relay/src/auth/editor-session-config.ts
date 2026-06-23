/**
 * Guards JWT secret availability at startup.
 * Returns encoded secret bytes; throws if EDITOR_JWT_SECRET is absent.
 */
export function loadEditorJwtSecret(env: Record<string, string | undefined>): Uint8Array {
  const secret = env.EDITOR_JWT_SECRET;
  if (!secret) {
    throw new Error("EDITOR_JWT_SECRET is required but not set or is empty.");
  }
  return new TextEncoder().encode(secret);
}
