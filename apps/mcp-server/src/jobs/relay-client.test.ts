import { describe, expect, it } from "vitest";
import { createHttpTransportApp } from "../transport/http-sse.ts";
import { createRelayJobsClient, resolveJobsClientFromEnv } from "./relay-client.ts";

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
}

function makeFakeFetch(
  handler: (call: FetchCall) => {
    status: number;
    body?: unknown;
    statusText?: string;
    ok?: boolean;
  }
): { fetchImpl: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
    const call: FetchCall = { url: String(url), init };
    calls.push(call);
    const { status, body, statusText, ok } = handler(call);
    const resolvedOk = ok ?? (status >= 200 && status < 300);
    return {
      ok: resolvedOk,
      status,
      statusText: statusText ?? "",
      json: async () => body,
      text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    } as Response;
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function lastCallBody(call: FetchCall): Record<string, unknown> {
  return JSON.parse(String(call.init?.body)) as Record<string, unknown>;
}

function lastCallHeaders(call: FetchCall): Record<string, string> {
  return call.init?.headers as Record<string, string>;
}

describe("createRelayJobsClient enqueue: kind mapping", () => {
  it("maps export_long_image to long-image-render", async () => {
    const { fetchImpl, calls } = makeFakeFetch(() => ({ status: 200, body: { jobId: "job-1" } }));
    const client = createRelayJobsClient({ baseUrl: "http://relay:8787", fetchImpl });
    await client.enqueue("export_long_image", { markdown: "# a" });
    expect(lastCallBody(calls[0]).kind).toBe("long-image-render");
  });

  it("maps export_cover to cover-render", async () => {
    const { fetchImpl, calls } = makeFakeFetch(() => ({ status: 200, body: { jobId: "job-1" } }));
    const client = createRelayJobsClient({ baseUrl: "http://relay:8787", fetchImpl });
    await client.enqueue("export_cover", { markdown: "# a" });
    expect(lastCallBody(calls[0]).kind).toBe("cover-render");
  });

  it("maps upload_image to image-upload", async () => {
    const { fetchImpl, calls } = makeFakeFetch(() => ({ status: 200, body: { jobId: "job-1" } }));
    const client = createRelayJobsClient({ baseUrl: "http://relay:8787", fetchImpl });
    await client.enqueue("upload_image", { url: "https://x/y.png" });
    expect(lastCallBody(calls[0]).kind).toBe("image-upload");
  });

  it("passes wechat-asset-upload through unchanged", async () => {
    const { fetchImpl, calls } = makeFakeFetch(() => ({ status: 200, body: { jobId: "job-1" } }));
    const client = createRelayJobsClient({ baseUrl: "http://relay:8787", fetchImpl });
    await client.enqueue("wechat-asset-upload", { imageUrl: "https://x/y.png" });
    expect(lastCallBody(calls[0]).kind).toBe("wechat-asset-upload");
  });

  it("passes an unknown kind through unchanged", async () => {
    const { fetchImpl, calls } = makeFakeFetch(() => ({ status: 200, body: { jobId: "job-1" } }));
    const client = createRelayJobsClient({ baseUrl: "http://relay:8787", fetchImpl });
    await client.enqueue("some_future_kind", { foo: "bar" });
    expect(lastCallBody(calls[0]).kind).toBe("some_future_kind");
  });

  it("sends payload as body.input", async () => {
    const { fetchImpl, calls } = makeFakeFetch(() => ({ status: 200, body: { jobId: "job-1" } }));
    const client = createRelayJobsClient({ baseUrl: "http://relay:8787", fetchImpl });
    await client.enqueue("export_long_image", { markdown: "# hi", themeId: "default" });
    expect(lastCallBody(calls[0]).input).toEqual({ markdown: "# hi", themeId: "default" });
  });
});

describe("createRelayJobsClient enqueue: conditional headers/body", () => {
  it("sends idempotency-key header only when opts.idempotencyKey is provided", async () => {
    const { fetchImpl, calls } = makeFakeFetch(() => ({ status: 200, body: { jobId: "job-1" } }));
    const client = createRelayJobsClient({ baseUrl: "http://relay:8787", fetchImpl });

    await client.enqueue("export_long_image", { markdown: "# a" }, { idempotencyKey: "key-1" });
    expect(lastCallHeaders(calls[0])["idempotency-key"]).toBe("key-1");

    await client.enqueue("export_long_image", { markdown: "# a" });
    expect(lastCallHeaders(calls[1])["idempotency-key"]).toBeUndefined();
  });

  it("sends authorization header only when bearerToken is configured", async () => {
    const { fetchImpl: fetchWithToken, calls: callsWithToken } = makeFakeFetch(() => ({
      status: 200,
      body: { jobId: "job-1" },
    }));
    const clientWithToken = createRelayJobsClient({
      baseUrl: "http://relay:8787",
      bearerToken: "secret-token",
      fetchImpl: fetchWithToken,
    });
    await clientWithToken.enqueue("export_long_image", { markdown: "# a" });
    expect(lastCallHeaders(callsWithToken[0]).authorization).toBe("Bearer secret-token");

    const { fetchImpl: fetchNoToken, calls: callsNoToken } = makeFakeFetch(() => ({
      status: 200,
      body: { jobId: "job-1" },
    }));
    const clientNoToken = createRelayJobsClient({
      baseUrl: "http://relay:8787",
      fetchImpl: fetchNoToken,
    });
    await clientNoToken.enqueue("export_long_image", { markdown: "# a" });
    expect(lastCallHeaders(callsNoToken[0]).authorization).toBeUndefined();
  });

  it("includes apiKeyId in body only when configured", async () => {
    const { fetchImpl: fetchWithKey, calls: callsWithKey } = makeFakeFetch(() => ({
      status: 200,
      body: { jobId: "job-1" },
    }));
    const clientWithKey = createRelayJobsClient({
      baseUrl: "http://relay:8787",
      apiKeyId: "key-abc",
      fetchImpl: fetchWithKey,
    });
    await clientWithKey.enqueue("export_long_image", { markdown: "# a" });
    expect(lastCallBody(callsWithKey[0]).apiKeyId).toBe("key-abc");

    const { fetchImpl: fetchNoKey, calls: callsNoKey } = makeFakeFetch(() => ({
      status: 200,
      body: { jobId: "job-1" },
    }));
    const clientNoKey = createRelayJobsClient({
      baseUrl: "http://relay:8787",
      fetchImpl: fetchNoKey,
    });
    await clientNoKey.enqueue("export_long_image", { markdown: "# a" });
    expect(lastCallBody(callsNoKey[0]).apiKeyId).toBeUndefined();
  });
});

describe("createRelayJobsClient enqueue: response handling", () => {
  it("returns jobId on 2xx success", async () => {
    const { fetchImpl } = makeFakeFetch(() => ({ status: 200, body: { jobId: "job-42" } }));
    const client = createRelayJobsClient({ baseUrl: "http://relay:8787", fetchImpl });
    const result = await client.enqueue("export_long_image", { markdown: "# a" });
    expect(result).toEqual({ jobId: "job-42" });
  });

  it("passes through relay error code/message on non-2xx JSON error body", async () => {
    const { fetchImpl } = makeFakeFetch(() => ({
      status: 400,
      body: { error: { code: "E_INVALID_REQUEST", message: "kind is required" } },
    }));
    const client = createRelayJobsClient({ baseUrl: "http://relay:8787", fetchImpl });
    const result = await client.enqueue("export_long_image", { markdown: "# a" });
    expect(result).toEqual({ code: "E_INVALID_REQUEST", message: "kind is required" });
  });

  it("falls back to E_RELAY_HTTP_<status> when error body is not parseable JSON", async () => {
    const fetchImpl = (async () => {
      return {
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        json: async () => {
          throw new Error("not json");
        },
        text: async () => "<html>Bad Gateway</html>",
      } as unknown as Response;
    }) as typeof fetch;
    const client = createRelayJobsClient({ baseUrl: "http://relay:8787", fetchImpl });
    const result = await client.enqueue("export_long_image", { markdown: "# a" });
    expect(result).toEqual({ code: "E_RELAY_HTTP_502", message: "Bad Gateway" });
  });

  it("returns E_RELAY_UNREACHABLE when fetch throws", async () => {
    const fetchImpl = (async () => {
      throw new Error("network down");
    }) as typeof fetch;
    const client = createRelayJobsClient({ baseUrl: "http://relay:8787", fetchImpl });
    const result = await client.enqueue("export_long_image", { markdown: "# a" });
    expect(result).toEqual({ code: "E_RELAY_UNREACHABLE", message: "network down" });
  });
});

describe("createRelayJobsClient getJob: state mapping", () => {
  it("maps each relay state to the JobsClient status field", async () => {
    for (const state of ["pending", "running", "succeeded", "failed"] as const) {
      const { fetchImpl } = makeFakeFetch(() => ({
        status: 200,
        body: { jobId: "job-1", state, result: null, error: null },
      }));
      const client = createRelayJobsClient({ baseUrl: "http://relay:8787", fetchImpl });
      const result = await client.getJob("job-1");
      expect(result.status).toBe(state);
    }
  });

  it("extracts result.url when result is present", async () => {
    const { fetchImpl } = makeFakeFetch(() => ({
      status: 200,
      body: {
        jobId: "job-1",
        state: "succeeded",
        result: { url: "https://cdn.example.com/img.png" },
        error: null,
      },
    }));
    const client = createRelayJobsClient({ baseUrl: "http://relay:8787", fetchImpl });
    const result = await client.getJob("job-1");
    expect(result.result).toEqual({ url: "https://cdn.example.com/img.png" });
  });

  it("omits result when relay result is null", async () => {
    const { fetchImpl } = makeFakeFetch(() => ({
      status: 200,
      body: { jobId: "job-1", state: "pending", result: null, error: null },
    }));
    const client = createRelayJobsClient({ baseUrl: "http://relay:8787", fetchImpl });
    const result = await client.getJob("job-1");
    expect(result.result).toBeUndefined();
  });

  it("combines error.code and error.message into a single error string", async () => {
    const { fetchImpl } = makeFakeFetch(() => ({
      status: 200,
      body: {
        jobId: "job-1",
        state: "failed",
        result: null,
        error: { code: "E_RENDER_TIMEOUT", message: "render exceeded 30s" },
      },
    }));
    const client = createRelayJobsClient({ baseUrl: "http://relay:8787", fetchImpl });
    const result = await client.getJob("job-1");
    expect(result.error).toBe("E_RENDER_TIMEOUT: render exceeded 30s");
  });

  it("returns status failed with the relay error code on 404", async () => {
    const { fetchImpl } = makeFakeFetch(() => ({
      status: 404,
      body: { error: { code: "E_NOT_FOUND", message: "job not found" } },
    }));
    const client = createRelayJobsClient({ baseUrl: "http://relay:8787", fetchImpl });
    const result = await client.getJob("missing-job");
    expect(result).toEqual({ status: "failed", error: "E_NOT_FOUND" });
  });

  it("returns status failed with E_RELAY_HTTP_<status> when a non-404 error body is unparseable", async () => {
    const fetchImpl = (async () => {
      return {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => {
          throw new Error("not json");
        },
        text: async () => "boom",
      } as unknown as Response;
    }) as typeof fetch;
    const client = createRelayJobsClient({ baseUrl: "http://relay:8787", fetchImpl });
    const result = await client.getJob("job-1");
    expect(result).toEqual({ status: "failed", error: "E_RELAY_HTTP_500" });
  });

  it("returns status failed with E_RELAY_UNREACHABLE when fetch throws", async () => {
    const fetchImpl = (async () => {
      throw new Error("network down");
    }) as typeof fetch;
    const client = createRelayJobsClient({ baseUrl: "http://relay:8787", fetchImpl });
    const result = await client.getJob("job-1");
    expect(result).toEqual({ status: "failed", error: "E_RELAY_UNREACHABLE" });
  });
});

describe("resolveJobsClientFromEnv", () => {
  it("returns a JobsClient when RELAY_BASE_URL is set", () => {
    const client = resolveJobsClientFromEnv({
      RELAY_BASE_URL: "http://relay:8787",
    } as NodeJS.ProcessEnv);
    expect(client).toBeDefined();
    expect(typeof client?.enqueue).toBe("function");
    expect(typeof client?.getJob).toBe("function");
  });

  it("returns undefined when RELAY_BASE_URL is absent", () => {
    const client = resolveJobsClientFromEnv({} as NodeJS.ProcessEnv);
    expect(client).toBeUndefined();
  });

  it("returns undefined when RELAY_BASE_URL is an empty string", () => {
    const client = resolveJobsClientFromEnv({ RELAY_BASE_URL: "" } as NodeJS.ProcessEnv);
    expect(client).toBeUndefined();
  });

  it("normalizes a trailing slash on RELAY_BASE_URL before issuing requests", async () => {
    const { fetchImpl, calls } = makeFakeFetch(() => ({ status: 200, body: { jobId: "job-1" } }));
    const client = createRelayJobsClient({ baseUrl: "http://relay:8787/", fetchImpl });
    await client.enqueue("export_long_image", { markdown: "# a" });
    expect(calls[0].url).toBe("http://relay:8787/api/v1/jobs");
  });
});

describe("integration: createHttpTransportApp wired with a relay-backed JobsClient", () => {
  it("POST /mcp/tools/export_long_image returns 200 with a jobId (no longer E_NOT_IMPLEMENTED)", async () => {
    const { fetchImpl } = makeFakeFetch(() => ({ status: 200, body: { jobId: "job-99" } }));
    const jobsClient = createRelayJobsClient({ baseUrl: "http://relay:8787", fetchImpl });
    const app = createHttpTransportApp({ jobsClient });

    const res = await app.request("/mcp/tools/export_long_image", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer wf_testtoken" },
      body: JSON.stringify({ markdown: "# Hello", themeId: "default" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(typeof body.jobId).toBe("string");
    expect(body.code).not.toBe("E_NOT_IMPLEMENTED");
  });
});
