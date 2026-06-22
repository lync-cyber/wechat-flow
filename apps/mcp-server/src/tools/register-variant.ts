import { registerVariant } from "@wechat-flow/core";

export function registerVariantTool(args: Record<string, unknown>) {
  const blockId = String(args.blockId ?? "");
  const variantId = String(args.variantId ?? "");
  const label = String(args.label ?? "");
  const style = (args.style ?? {}) as Record<string, Record<string, string>>;

  try {
    registerVariant({ blockId, id: variantId, label, style });
    return { registered: true, variantId, rejectedDeclarations: [] };
  } catch (e) {
    const err = e as { code?: string; rejectedDeclarations?: unknown[] };
    if (err.rejectedDeclarations) {
      return { registered: false, variantId, rejectedDeclarations: err.rejectedDeclarations };
    }
    if (err.code) return { code: err.code };
    throw e;
  }
}
