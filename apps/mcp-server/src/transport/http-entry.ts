import { serve } from "@hono/node-server";
import { resolveJobsClientFromEnv } from "../jobs/relay-client.ts";
import { type HttpTransportDeps, createHttpTransportApp } from "./http-sse.ts";

/**
 * Starts the MCP HTTP transport on the given port.
 * Exports the server handle returned by @hono/node-server serve().
 */
export function startHttpTransport(
  port: number,
  deps: HttpTransportDeps = {}
): ReturnType<typeof serve> {
  const resolvedDeps: HttpTransportDeps = {
    ...deps,
    jobsClient: deps.jobsClient ?? resolveJobsClientFromEnv(),
  };
  const app = createHttpTransportApp(resolvedDeps);
  return serve({ fetch: app.fetch, port }, (info) => {
    console.log(`mcp-server HTTP transport listening on http://localhost:${info.port}`);
  });
}
