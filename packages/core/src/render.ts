import { inlineStyle } from "./pipeline/inline-style.ts";
import { injectNodeIds } from "./pipeline/node-id-injector.ts";
import { parseMarkdown } from "./pipeline/parse.ts";
import { serializeHast } from "./pipeline/serialize.ts";
import { transformToHast } from "./pipeline/transform.ts";
import type { RenderOptions, RenderResult } from "./types.ts";
import { coreVersion } from "./version/triple.ts";

export async function renderMarkdown(
  input: string,
  options?: RenderOptions
): Promise<RenderResult> {
  const mdast = parseMarkdown(input);
  let hast = transformToHast(mdast, options);
  if (options?.injectNodeIds) {
    hast = injectNodeIds(hast);
  }
  const styledHast = inlineStyle(hast);
  const html = serializeHast(styledHast);

  return {
    html,
    diagnostics: [],
    rulesetVersion: options?.rulesetVersion ?? "0.0.0",
    themeVersion: "0.0.0", // cataforge: wiring-placeholder — theme registry wiring deferred
    coreVersion,
  };
}
