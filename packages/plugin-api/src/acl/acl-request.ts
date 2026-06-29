import type { AuditLog } from "./audit-log.ts";
import { checkNetworkAccess } from "./network-gate.ts";

export const E_PERMISSION_DENIED = "E_PERMISSION_DENIED";

interface AclManifest {
  id: string;
  permissions: {
    network?: string[];
  };
}

/**
 * Checks network access against the manifest whitelist, records the audit decision,
 * and fetches the resource when access is allowed.
 * Throws E_PERMISSION_DENIED when denied.
 */
export async function aclRequestResource(
  url: string,
  manifest: AclManifest,
  auditLog: AuditLog,
  fetch: (url: string) => Promise<Response>
): Promise<Response> {
  const patterns = manifest.permissions.network ?? [];
  const allowed = checkNetworkAccess(url, patterns);

  if (!allowed) {
    auditLog.record({ action: "deny", url, pluginId: manifest.id, ts: Date.now() });
    throw new Error(E_PERMISSION_DENIED);
  }

  auditLog.record({ action: "allow", url, pluginId: manifest.id, ts: Date.now() });
  return fetch(url);
}
