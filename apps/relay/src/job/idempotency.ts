import { createHash } from "node:crypto";
import type { IdempotencyStore } from "./types.ts";

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const sorted = Object.keys(value as Record<string, unknown>)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalize((value as Record<string, unknown>)[k])}`);
  return `{${sorted.join(",")}}`;
}

export function computeIdempotencyKey(input: unknown, toolsetVersion: string): string {
  const canonical = canonicalize(input) + toolsetVersion;
  return createHash("sha256").update(canonical).digest("hex");
}

function buildRedisKey(apiKeyId: string, digest: string): string {
  return `idem:${apiKeyId}:${digest}`;
}

export async function checkIdempotency(
  apiKeyId: string,
  digest: string,
  store: IdempotencyStore
): Promise<string | null> {
  return store.get(buildRedisKey(apiKeyId, digest));
}

export async function registerIdempotency(
  apiKeyId: string,
  digest: string,
  jobId: string,
  ttlSeconds: number,
  store: IdempotencyStore
): Promise<void> {
  await store.set(buildRedisKey(apiKeyId, digest), jobId, ttlSeconds);
}
