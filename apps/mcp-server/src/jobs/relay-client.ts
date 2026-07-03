import type { EnqueueResult, JobsClient } from "./client.ts";

const KIND_MAP: Record<string, string> = {
  export_long_image: "long-image-render",
  export_cover: "cover-render",
  upload_image: "image-upload",
};

function mapKind(kind: string): string {
  return KIND_MAP[kind] ?? kind;
}

export interface RelayJobsClientOpts {
  baseUrl: string;
  bearerToken?: string;
  apiKeyId?: string;
  fetchImpl?: typeof fetch;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

async function parseErrorBody(res: Response): Promise<{ code: string; message: string }> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    if (body?.error?.code) {
      return { code: body.error.code, message: body.error.message ?? res.statusText };
    }
  } catch {
    // fall through to generic HTTP status fallback
  }
  return { code: `E_RELAY_HTTP_${res.status}`, message: res.statusText || `HTTP ${res.status}` };
}

export function createRelayJobsClient(opts: RelayJobsClientOpts): JobsClient {
  const baseUrl = normalizeBaseUrl(opts.baseUrl);
  const fetchImpl = opts.fetchImpl ?? fetch;

  function buildHeaders(idempotencyKey?: string): Record<string, string> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (opts.bearerToken) headers.authorization = `Bearer ${opts.bearerToken}`;
    if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
    return headers;
  }

  return {
    async enqueue(
      kind: string,
      payload: unknown,
      enqueueOpts?: { idempotencyKey?: string }
    ): Promise<EnqueueResult> {
      const body: Record<string, unknown> = { kind: mapKind(kind), input: payload };
      if (opts.apiKeyId) body.apiKeyId = opts.apiKeyId;

      let res: Response;
      try {
        res = await fetchImpl(`${baseUrl}/api/v1/jobs`, {
          method: "POST",
          headers: buildHeaders(enqueueOpts?.idempotencyKey),
          body: JSON.stringify(body),
        });
      } catch (err) {
        return { code: "E_RELAY_UNREACHABLE", message: (err as Error).message };
      }

      if (!res.ok) return parseErrorBody(res);
      const json = (await res.json()) as { jobId: string };
      return { jobId: json.jobId };
    },

    async getJob(jobId: string) {
      let res: Response;
      try {
        res = await fetchImpl(`${baseUrl}/api/v1/jobs/${jobId}`, {
          method: "GET",
          headers: buildHeaders(),
        });
      } catch {
        return { status: "failed" as const, error: "E_RELAY_UNREACHABLE" };
      }

      if (!res.ok) {
        const { code } = await parseErrorBody(res);
        return { status: "failed" as const, error: code };
      }

      const json = (await res.json()) as {
        state: "pending" | "running" | "succeeded" | "failed";
        result?: { url: string } | null;
        error?: { code: string; message: string } | null;
      };

      return {
        status: json.state,
        ...(json.result ? { result: { url: json.result.url } } : {}),
        ...(json.error ? { error: `${json.error.code}: ${json.error.message}` } : {}),
      };
    },
  };
}

export function resolveJobsClientFromEnv(
  env: NodeJS.ProcessEnv = process.env
): JobsClient | undefined {
  const baseUrl = env.RELAY_BASE_URL;
  if (!baseUrl) return undefined;
  return createRelayJobsClient({
    baseUrl,
    bearerToken: env.RELAY_BEARER_TOKEN,
    apiKeyId: env.RELAY_API_KEY_ID,
  });
}
