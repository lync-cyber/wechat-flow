export const E_WORKER_NETWORK_LEAK = "E_WORKER_NETWORK_LEAK";

export interface GlobalNetworkScope {
  fetch?: unknown;
  XMLHttpRequest?: unknown;
  WebSocket?: unknown;
  EventSource?: unknown;
}

/**
 * Asserts that network globals have been deleted from the Worker scope.
 * Throws E_WORKER_NETWORK_LEAK and calls close() if any leak is detected.
 */
export function assertNetIsolation(scope: GlobalNetworkScope, close: () => void): void {
  const leaked =
    scope.fetch !== undefined ||
    scope.XMLHttpRequest !== undefined ||
    scope.WebSocket !== undefined ||
    scope.EventSource !== undefined;
  if (leaked) {
    close();
    throw new Error(E_WORKER_NETWORK_LEAK);
  }
}
