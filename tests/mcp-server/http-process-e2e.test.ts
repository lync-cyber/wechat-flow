import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repoRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const serverCwd = path.join(repoRoot, "apps", "mcp-server");

// 与 apps/mcp-server/Dockerfile CMD 相同的生产 bootstrap；相对 import 以 cwd 为基准。
const BOOTSTRAP_EVAL =
  "import('./src/transport/http-entry.ts').then(m => m.startHttpTransport(Number(process.env.PORT ?? 8788)))";

async function findFreePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const address = srv.address();
      if (address && typeof address === "object") {
        const { port } = address;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error("no port assigned")));
      }
    });
  });
}

async function waitForReady(
  baseUrl: string,
  child: ChildProcess,
  timeoutMs: number
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`mcp-server 进程提前退出，exit code ${child.exitCode}`);
    }
    try {
      const res = await fetch(`${baseUrl}/metrics`);
      if (res.ok) return;
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`mcp-server HTTP transport ${timeoutMs}ms 内未就绪: ${String(lastError)}`);
}

describe("T-125: mcp-server HTTP transport 真进程 E2E", () => {
  let child: ChildProcess;
  let baseUrl: string;
  let stderrBuf = "";

  beforeAll(async () => {
    const port = await findFreePort();
    baseUrl = `http://127.0.0.1:${port}`;
    // RELAY_BASE_URL 置 undefined（spawn 跳过该键）：隔离外部 relay 配置，
    // 确保 jobsClient 走 not-implemented 回退。
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PORT: String(port),
      RELAY_BASE_URL: undefined,
    };

    child = spawn(process.execPath, ["--experimental-strip-types", "-e", BOOTSTRAP_EVAL], {
      cwd: serverCwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderrBuf += chunk.toString();
    });

    try {
      await waitForReady(baseUrl, child, 60_000);
    } catch (err) {
      throw new Error(`${(err as Error).message}\nstderr:\n${stderrBuf}`);
    }
  }, 90_000);

  afterAll(async () => {
    if (child && child.exitCode === null) {
      child.kill();
      await once(child, "exit");
    }
  }, 30_000);

  it("POST /mcp/tools/render_markdown 经真实 HTTP 返回 200 与渲染产物", async () => {
    const res = await fetch(`${baseUrl}/mcp/tools/render_markdown`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markdown: "# Process E2E" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { html: string };
    expect(typeof body.html).toBe("string");
    expect(body.html).toContain("Process E2E");
  });

  it("GET /metrics 暴露 Prometheus SLI 且不受 Bearer 门控", async () => {
    const res = await fetch(`${baseUrl}/metrics`);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    const text = await res.text();
    expect(text).toContain("render_markdown_latency_ms_count");
  });

  it("POST 未知 tool 返回 404 E_NOT_FOUND", async () => {
    const res = await fetch(`${baseUrl}/mcp/tools/unknown_tool_xyz`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_NOT_FOUND");
  });

  it("POST 非法 JSON 返回 400 E_INVALID_JSON", async () => {
    const res = await fetch(`${baseUrl}/mcp/tools/render_markdown`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ not valid json",
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_INVALID_JSON");
  });
});
