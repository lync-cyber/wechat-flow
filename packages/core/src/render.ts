import { applyRuleset, builtinRules, getRulesetVersion } from "@wechat-flow/ruleset";
import { inlineStyle } from "./pipeline/inline-style.ts";
import { injectNodeIds } from "./pipeline/node-id-injector.ts";
import { parseMarkdown } from "./pipeline/parse.ts";
import { sanitizeHast } from "./pipeline/sanitize.ts";
import { serializeHast } from "./pipeline/serialize.ts";
import { transformToHast } from "./pipeline/transform.ts";
import { wechatFlowSanitizeSchema } from "./sanitize/schema.ts";
import type { RenderOptions, RenderResult } from "./types.ts";
import { coreVersion } from "./version/triple.ts";

export async function renderMarkdown(
  input: string,
  options?: RenderOptions
): Promise<RenderResult> {
  const mdast = parseMarkdown(input);
  let hast = transformToHast(mdast, options);
  hast = sanitizeHast(hast, wechatFlowSanitizeSchema);

  const rules = options?.rules !== undefined ? options.rules : builtinRules;
  const { hast: rulesetHast, report } = applyRuleset(hast, rules);
  hast = rulesetHast;

  if (options?.injectNodeIds) {
    hast = injectNodeIds(hast);
  }
  const themeTokens = options?.theme?.blocks;
  const styledHast = inlineStyle(hast, themeTokens);
  const html = serializeHast(styledHast);

  return {
    html,
    diagnostics: report.diagnostics,
    rulesetVersion: getRulesetVersion(),
    themeVersion: options?.theme?.meta?.version ?? "0.0.0",
    postPaste: false,
    coreVersion,
    report,
  };
}
