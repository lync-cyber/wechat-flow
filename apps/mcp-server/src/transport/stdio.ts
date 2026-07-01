import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { type ApiKeyStore, verifyApiKey } from "../auth/api-key.ts";
import { registerBuiltins } from "../bootstrap.ts";
import { checkDeprecations } from "../deprecation.ts";
import type { JobsClient } from "../jobs/client.ts";
import { makeNotImplementedJobsClient } from "../jobs/client.ts";
import { registerAllTools } from "../tools/router.ts";

export interface ServerDeps {
  name?: string;
  version?: string;
  apiKeyStore?: ApiKeyStore;
  rawApiKey?: string;
  jobsClient?: JobsClient;
}

export function createServer(deps?: ServerDeps): McpServer {
  registerBuiltins();
  const server = new McpServer({
    name: deps?.name ?? "wechat-flow-mcp",
    version: deps?.version ?? "0.0.0",
  });
  const store: ApiKeyStore = deps?.apiKeyStore ?? new Map();
  const keyRecord = verifyApiKey(deps?.rawApiKey, store);
  const jobsClient = deps?.jobsClient ?? makeNotImplementedJobsClient();
  registerAllTools(server, keyRecord, jobsClient);
  for (const w of checkDeprecations()) {
    if (w.expired) {
      console.warn(
        `[deprecation] ${w.toolName}.${w.field} 已于 ${w.since} 标记弃用，窗口已于 ${w.until} 到期`
      );
    }
  }
  return server;
}

export async function startStdioTransport(deps?: ServerDeps): Promise<void> {
  const resolvedDeps: ServerDeps = {
    ...deps,
    rawApiKey: deps?.rawApiKey ?? process.env.WECHAT_FLOW_MCP_API_KEY,
    apiKeyStore: deps?.apiKeyStore,
  };
  const server = createServer(resolvedDeps);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
