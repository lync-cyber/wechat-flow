/** Worker entry point — Comlink RPC bridge skeleton. */
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
