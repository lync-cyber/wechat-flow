import { renderMarkdown } from "./render.ts";
import type { RenderOptions } from "./types.ts";
import { canonicalStringify } from "./utils/deterministic.ts";

type RenderFn = (
  input: string,
  options?: RenderOptions
) => Promise<{ html: string; diagnostics?: unknown }>;

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyDeterminism(
  input: string,
  options?: RenderOptions,
  iterations = 3,
  render: RenderFn = renderMarkdown
): Promise<boolean> {
  const runs = Math.max(2, iterations);
  let reference: string | undefined;
  for (let i = 0; i < runs; i++) {
    const r = await render(input, options);
    const hash = await sha256Hex(canonicalStringify({ html: r.html, diagnostics: r.diagnostics }));
    if (reference === undefined) {
      reference = hash;
    } else if (hash !== reference) {
      return false;
    }
  }
  return true;
}
