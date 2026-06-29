import { assertNetIsolation } from "./assert-net-isolation.ts";

export type PluginRpcApi = {
  invoke(method: string, args: unknown[]): Promise<unknown>;
};

export function createPluginRpc(): PluginRpcApi {
  return {
    async invoke(_method: string, _args: unknown[]): Promise<unknown> {
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
}

/**
 * Initialises the plugin Worker: deletes network globals in order,
 * asserts isolation, then exposes the RPC API via comlink.
 */
export function bootstrapWorker({ globalScope, selfClose, comlink }: BootstrapDeps): void {
  // biome-ignore lint/performance/noDelete: removing network globals from Worker scope is the security intent
  delete globalScope.fetch;
  // biome-ignore lint/performance/noDelete: removing network globals from Worker scope is the security intent
  delete globalScope.XMLHttpRequest;
  // biome-ignore lint/performance/noDelete: removing network globals from Worker scope is the security intent
  delete globalScope.WebSocket;
  // biome-ignore lint/performance/noDelete: removing network globals from Worker scope is the security intent
  delete globalScope.EventSource;

  assertNetIsolation(globalScope, selfClose);

  comlink.expose(createPluginRpc());
}
