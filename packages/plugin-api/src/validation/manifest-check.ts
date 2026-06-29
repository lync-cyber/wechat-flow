import { E_PERMISSION_DENIED } from "../acl/acl-request.ts";
import { checkNetworkAccess } from "../acl/network-gate.ts";

export { E_PERMISSION_DENIED };

export interface VariantIntent {
  blockId: string;
  variantId: string;
}

export interface PluginManifest {
  id: string;
  permissions: {
    network?: string[];
  };
  intents?: {
    variants?: VariantIntent[];
  };
}

export const E_MANIFEST_VARIANT_MISMATCH = "E_MANIFEST_VARIANT_MISMATCH";

export interface VariantMismatchWarning {
  code: typeof E_MANIFEST_VARIANT_MISMATCH;
  blockId: string;
  variantId: string;
  pluginId: string;
}

export function checkManifestVariantIntents(
  manifest: Pick<PluginManifest, "id" | "intents">,
  registered: Array<{ blockId: string; variantId: string }>
): VariantMismatchWarning[] {
  const intents = manifest.intents?.variants ?? [];
  const warnings: VariantMismatchWarning[] = [];
  for (const intent of intents) {
    const found = registered.some(
      (r) => r.blockId === intent.blockId && r.variantId === intent.variantId
    );
    if (!found) {
      warnings.push({
        code: E_MANIFEST_VARIANT_MISMATCH,
        blockId: intent.blockId,
        variantId: intent.variantId,
        pluginId: manifest.id,
      });
    }
  }
  return warnings;
}

/**
 * Requests a network resource on behalf of a plugin.
 * Throws E_PERMISSION_DENIED if the URL is not covered by manifest permissions.
 */
export function requestResource(
  url: string,
  manifest: PluginManifest,
  auditRecord: (entry: {
    action: "allow" | "deny";
    url: string;
    pluginId: string;
    ts: number;
  }) => void
): void {
  const patterns = manifest.permissions.network ?? [];
  const allowed = checkNetworkAccess(url, patterns);
  if (!allowed) {
    auditRecord({ action: "deny", url, pluginId: manifest.id, ts: Date.now() });
    throw new Error(E_PERMISSION_DENIED);
  }
  auditRecord({ action: "allow", url, pluginId: manifest.id, ts: Date.now() });
}
