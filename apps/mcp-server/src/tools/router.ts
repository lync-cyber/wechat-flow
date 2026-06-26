import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ALL_TOOL_SCHEMAS } from "@wechat-flow/contracts";
import type { ApiKeyRecord } from "../auth/api-key.ts";
import { type AuthError, guardUserScope } from "../auth/scope-guard.ts";
import type { JobsClient } from "../jobs/client.ts";
import { makeNotImplementedJobsClient } from "../jobs/client.ts";
import { applyZhTypoTool } from "./apply-zh-typo.ts";
import { describeBlockTool } from "./describe-block.ts";
import { describeMarkTool } from "./describe-mark.ts";
import { describeTemplateTool } from "./describe-template.ts";
import { describeThemeTool } from "./describe-theme.ts";
import { exportCoverTool } from "./export-cover.ts";
import { exportLongImageTool } from "./export-long-image.ts";
import { getJobTool } from "./get-job.ts";
import { getRulesetVersionTool } from "./get-ruleset-version.ts";
import { lintMarkdownTool } from "./lint-markdown.ts";
import { listBlocksTool } from "./list-blocks.ts";
import { listMarksTool } from "./list-marks.ts";
import { listThemesTool } from "./list-themes.ts";
import { registerVariantTool } from "./register-variant.ts";
import { renderMarkdownTool } from "./render-markdown.ts";
import { uploadImageTool } from "./upload-image.ts";

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown> | unknown;

function buildHandlers(jobsClient: JobsClient): Record<string, ToolHandler> {
  return {
    apply_zh_typo: applyZhTypoTool,
    render_markdown: renderMarkdownTool,
    lint_markdown: lintMarkdownTool,
    get_ruleset_version: getRulesetVersionTool,
    list_themes: listThemesTool,
    describe_theme: describeThemeTool,
    list_blocks: listBlocksTool,
    describe_block: describeBlockTool,
    list_marks: listMarksTool,
    describe_mark: describeMarkTool,
    describe_template: describeTemplateTool,
    register_variant: registerVariantTool,
    export_long_image: exportLongImageTool(jobsClient),
    export_cover: exportCoverTool(jobsClient),
    get_job: getJobTool(jobsClient),
    upload_image: uploadImageTool(jobsClient),
  };
}

function isErrorResult(result: unknown): boolean {
  if (result === null || typeof result !== "object") return false;
  const code = (result as Record<string, unknown>).code;
  return (
    code === "E_AUTH_REQUIRED" || code === "E_PERMISSION_DENIED" || code === "E_NOT_IMPLEMENTED"
  );
}

export type DispatchResult =
  | { code: "E_NOT_IMPLEMENTED"; tool: string }
  | AuthError
  | Record<string, unknown>;

export async function dispatchTool(
  name: string,
  args: Record<string, unknown>,
  keyRecord: ApiKeyRecord | null,
  jobsClient: JobsClient = makeNotImplementedJobsClient()
): Promise<DispatchResult> {
  const authError = guardUserScope(keyRecord);
  if (authError) return authError;
  const handlers = buildHandlers(jobsClient);
  const handler = handlers[name];
  if (handler) return (await handler(args)) as Record<string, unknown>;
  return { code: "E_NOT_IMPLEMENTED", tool: name };
}

export function registerAllTools(
  server: McpServer,
  keyRecord: ApiKeyRecord | null,
  jobsClient: JobsClient = makeNotImplementedJobsClient()
): void {
  const handlers = buildHandlers(jobsClient);
  for (const [name, schema] of Object.entries(ALL_TOOL_SCHEMAS)) {
    server.registerTool(name, { inputSchema: schema }, async (_args: Record<string, unknown>) => {
      const authError = guardUserScope(keyRecord);
      if (authError) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify(authError) }],
          isError: true,
        };
      }
      const handler = handlers[name];
      const result = handler
        ? ((await handler(_args)) as Record<string, unknown>)
        : ({ code: "E_NOT_IMPLEMENTED", tool: name } as Record<string, unknown>);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
        isError: isErrorResult(result),
      };
    });
  }
}
