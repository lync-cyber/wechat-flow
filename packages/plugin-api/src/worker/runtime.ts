import { aclRequestResource } from "../acl/acl-request.ts";
import type { AuditLog } from "../acl/audit-log.ts";
import { assertNetIsolation } from "./assert-net-isolation.ts";

export type PluginRpcApi = {
  invoke(method: string, args: unknown[]): Promise<unknown>;
};

interface RpcDeps {
  manifest: { id: string; permissions: { network?: string[] } };
  auditLog: AuditLog;
  fetch: (url: string) => Promise<Response>;
}

export function createPluginRpc(deps?: RpcDeps): PluginRpcApi {
  return {
    async invoke(method: string, args: unknown[]): Promise<unknown> {
      if (method === "requestResource" && deps) {
        const [url] = args as [string];
        return aclRequestResource(url, deps.manifest, deps.auditLog, deps.fetch);
      }
      return null;
    },
  };
}

interface WorkerScope {
  fetch?: unknown;
  XMLHttpRequest?: unknown;
  WebSocket?: unknown;
  EventSource?: unknown;
  [key: string]: unknown;
}

interface ComlinkLike {
  expose(api: unknown): void;
}

interface BootstrapDeps {
  globalScope: WorkerScope;
  selfClose: () => void;
  comlink: ComlinkLike;
  rpc?: RpcDeps;
}

/**
 * Initialises the plugin Worker: deletes network globals in order,
 * asserts isolation, then exposes the RPC API via comlink.
 */
export function bootstrapWorker({ globalScope, selfClose, comlink, rpc }: BootstrapDeps): void {
  // biome-ignore lint/performance/noDelete: removing network globals from Worker scope is the security intent
  delete globalScope.fetch;
  // biome-ignore lint/performance/noDelete: removing network globals from Worker scope is the security intent
  delete globalScope.XMLHttpRequest;
  // biome-ignore lint/performance/noDelete: removing network globals from Worker scope is the security intent
  delete globalScope.WebSocket;
  // biome-ignore lint/performance/noDelete: removing network globals from Worker scope is the security intent
  delete globalScope.EventSource;

  assertNetIsolation(globalScope, selfClose);

  comlink.expose(createPluginRpc(rpc));
}
