import { checkNetworkAccess } from "../acl/network-gate.ts";

export interface PluginManifest {
  id: string;
  permissions: {
    network?: string[];
  };
}

export const E_PERMISSION_DENIED = "E_PERMISSION_DENIED";

/**
 * Requests a network resource on behalf of a plugin.
 * Throws E_PERMISSION_DENIED if the URL is not covered by manifest permissions.
 */
export function requestResource(
  url: string,
  manifest: PluginManifest,
  auditRecord: (entry: { allow: boolean; url: string; pluginId: string; ts: number }) => void
): void {
  const patterns = manifest.permissions.network ?? [];
  const allowed = checkNetworkAccess(url, patterns);
  if (!allowed) {
    throw new Error(E_PERMISSION_DENIED);
  }
  auditRecord({ allow: true, url, pluginId: manifest.id, ts: Date.now() });
}
