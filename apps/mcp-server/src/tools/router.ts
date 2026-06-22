// cataforge: wiring-placeholder — Tool handlers 占位返回 E_NOT_IMPLEMENTED，真实实现见 T-037/T-038/T-039/T-122
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ALL_TOOL_SCHEMAS } from "@wechat-flow/contracts";
import type { ApiKeyRecord } from "../auth/api-key.ts";
import { type AuthError, guardUserScope } from "../auth/scope-guard.ts";

export type DispatchResult = { code: "E_NOT_IMPLEMENTED"; tool: string } | AuthError;

export function dispatchTool(
  name: string,
  _args: unknown,
  keyRecord: ApiKeyRecord | null
): DispatchResult {
  const authError = guardUserScope(keyRecord);
  if (authError) return authError;
  return { code: "E_NOT_IMPLEMENTED", tool: name };
}

export function registerAllTools(server: McpServer, keyRecord: ApiKeyRecord | null): void {
  for (const [name, schema] of Object.entries(ALL_TOOL_SCHEMAS)) {
    server.registerTool(name, { inputSchema: schema }, (_args: Record<string, unknown>) => {
      const result = dispatchTool(name, _args, keyRecord);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
        isError: true,
      };
    });
  }
}
