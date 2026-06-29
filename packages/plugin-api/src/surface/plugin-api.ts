import type { ZodType } from "zod";
import { E_PERMISSION_DENIED, aclRequestResource } from "../acl/acl-request.ts";
import type { AuditLog } from "../acl/audit-log.ts";

export interface DefineBlockInput {
  id: string;
  name: string;
  attrsSchema: ZodType;
  render: (attrs: Record<string, unknown>) => string;
  slots?: string[];
}

export interface DefineVariantInput {
  blockId: string;
  id: string;
  label: string;
  style: Record<string, Record<string, string>>;
  render: (attrs: Record<string, unknown>) => string;
}

export interface DefineRuleInput {
  id: string;
  description: string;
  fix: (text: string) => string;
}

export interface DefineThemeInput {
  id: string;
  name: string;
  tokens: Record<string, string>;
}

export interface RegisterAssetInput {
  id: string;
  url: string;
  mimeType: string;
}

export interface BlockRegistryEntry {
  id: string;
  name: string;
  attrsSchema: ZodType;
  variants: Array<{ id: string; label?: string }>;
  baseStyle?: Record<string, Record<string, string>>;
  slots: string[];
}

export interface VariantRegistryInput {
  blockId: string;
  id: string;
  label: string;
  style: Record<string, Record<string, string>>;
}

export interface RegistryBridge {
  registerBlock: (def: BlockRegistryEntry) => void;
  describeBlock: (id: string) => BlockRegistryEntry | undefined;
  registerVariant: (input: VariantRegistryInput) => void;
  listBlockVariants: (blockId: string) => Array<{ id: string; label: string }>;
}

export interface AclDeps {
  manifest: { id: string; permissions: { network?: string[] } };
  auditLog: AuditLog;
  fetch: (url: string) => Promise<Response>;
}

export interface PluginSurface {
  defineBlock: (input: DefineBlockInput) => void;
  defineVariant: (input: DefineVariantInput) => void;
  defineRule: (input: DefineRuleInput) => void;
  defineTheme: (input: DefineThemeInput) => void;
  registerAsset: (input: RegisterAssetInput) => void;
  requestResource: (url: string) => Promise<Response>;
}

export function createPluginSurface(registry: RegistryBridge, acl?: AclDeps): PluginSurface {
  return {
    defineBlock(input: DefineBlockInput): void {
      registry.registerBlock({
        id: input.id,
        name: input.name,
        attrsSchema: input.attrsSchema,
        variants: [],
        slots: input.slots ?? ["root"],
      });
    },

    defineVariant(input: DefineVariantInput): void {
      registry.registerVariant({
        blockId: input.blockId,
        id: input.id,
        label: input.label,
        style: input.style,
      });
    },

    defineRule(_input: DefineRuleInput): void {
      // Rule registration delegates to M-003 via Comlink in production.
    },

    defineTheme(_input: DefineThemeInput): void {
      // Theme registration delegates to M-005 via Comlink in production.
    },

    registerAsset(_input: RegisterAssetInput): void {
      // Asset registration delegates to main thread asset store via Comlink.
    },

    async requestResource(url: string): Promise<Response> {
      if (!acl) {
        return Promise.reject(new Error(E_PERMISSION_DENIED));
      }
      return aclRequestResource(url, acl.manifest, acl.auditLog, acl.fetch);
    },
  };
}
