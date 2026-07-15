import type { Element, Root as HastRoot } from "hast";
import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";
import { renderMarkdown } from "../render.ts";
import { listBlocks } from "./block.ts";
import { INTENTIONAL_PLAIN_VARIANTS } from "./intentional-plain-variants.ts";

export interface VariantDiffFinding {
  blockId: string;
  variantId: string;
}

export interface VariantDiffGuardOptions {
  buildMarkdown: (blockId: string, variantId: string) => string;
  themeId?: string;
  exclude?: Set<string>;
}

type HastParent = HastRoot | Element;

function stripDataVariant(node: HastParent): void {
  for (const child of node.children) {
    if (child.type !== "element") continue;
    const el = child as Element;
    if (Object.hasOwn(el.properties, "dataVariant")) {
      el.properties = Object.fromEntries(
        Object.entries(el.properties).filter(([key]) => key !== "dataVariant")
      );
    }
    stripDataVariant(el);
  }
}

function normalizeHtml(html: string): string {
  const tree = fromHtml(html, { fragment: true });
  stripDataVariant(tree);
  return toHtml(tree);
}

export async function runVariantDiffGuard(
  options: VariantDiffGuardOptions
): Promise<VariantDiffFinding[]> {
  const { buildMarkdown, themeId = "default", exclude } = options;
  const findings: VariantDiffFinding[] = [];
  const defaultCache = new Map<string, string>();

  async function getNormalizedDefault(blockId: string): Promise<string> {
    const cached = defaultCache.get(blockId);
    if (cached !== undefined) return cached;
    const result = await renderMarkdown(buildMarkdown(blockId, "default"), { themeId });
    const normalized = normalizeHtml(result.html);
    defaultCache.set(blockId, normalized);
    return normalized;
  }

  for (const block of listBlocks()) {
    for (const variant of block.variants) {
      if (variant.id === "default") continue;
      const key = `${block.id}::${variant.id}`;
      if (exclude?.has(key)) continue;
      if (INTENTIONAL_PLAIN_VARIANTS.has(key)) continue;

      const normalizedDefault = await getNormalizedDefault(block.id);
      const variantResult = await renderMarkdown(buildMarkdown(block.id, variant.id), { themeId });
      const normalizedVariant = normalizeHtml(variantResult.html);

      if (normalizedVariant !== normalizedDefault) continue;

      findings.push({ blockId: block.id, variantId: variant.id });
      console.warn(
        `[variant-diff-guard] block "${block.id}" variant "${variant.id}" renders identically to default (themeId="${themeId}")`
      );
    }
  }

  return findings;
}
