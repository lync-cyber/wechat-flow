import type { Diagnostic, ThemeDefinition } from "@wechat-flow/contracts";
import { applyRuleset, builtinRules, getRulesetVersion } from "@wechat-flow/ruleset";
import { contextAwareRender } from "./pipeline/context-aware-renderer.ts";
import { applyCustomCss } from "./pipeline/custom-css.ts";
import { injectDecorations } from "./pipeline/decoration-injector.ts";
import { injectDividerDecorations } from "./pipeline/divider-decoration.ts";
import { parseFrontmatter } from "./pipeline/frontmatter.ts";
import { inlineStyle } from "./pipeline/inline-style.ts";
import { injectNodeIds } from "./pipeline/node-id-injector.ts";
import { parseMarkdown } from "./pipeline/parse.ts";
import { collectNightRiskIssues } from "./pipeline/readability.ts";
import { sanitizeHast } from "./pipeline/sanitize.ts";
import { serializeHast } from "./pipeline/serialize.ts";
import { applyBaseColorToBlocks, applyPaintToBlocks } from "./pipeline/theme-override.ts";
import { transformToHast } from "./pipeline/transform.ts";
import { describeTheme } from "./registry/theme.ts";
import { wechatFlowSanitizeSchema } from "./sanitize/schema.ts";
import type { RenderOptions, RenderResult } from "./types.ts";
import { coreVersion } from "./version/triple.ts";

export async function renderMarkdown(
  input: string,
  options?: RenderOptions
): Promise<RenderResult> {
  const { content, meta } = parseFrontmatter(input);

  // paint > base-color > theme default priority
  // theme resolution: options.theme > frontmatter meta.theme > options.themeId
  let effectiveTheme: ThemeDefinition | undefined = options?.theme;

  if (!effectiveTheme && meta.theme) {
    effectiveTheme = describeTheme(meta.theme);
  }

  if (!effectiveTheme && options?.themeId) {
    effectiveTheme = describeTheme(options.themeId);
  }

  const paintDiagnostics: Diagnostic[] = [];

  if (effectiveTheme) {
    // Apply base-color derivation first (lower priority than paint)
    if (meta["base-color"] && typeof meta["base-color"] === "string") {
      const derivedBlocks = applyBaseColorToBlocks(effectiveTheme, meta["base-color"]);
      effectiveTheme = { ...effectiveTheme, blocks: derivedBlocks };
    }

    // Apply paint overrides (highest priority)
    if (meta.paint && typeof meta.paint === "object") {
      const { blocks: paintedBlocks, warnDiagnostics } = applyPaintToBlocks(
        effectiveTheme,
        meta.paint as Record<string, string>
      );
      effectiveTheme = { ...effectiveTheme, blocks: paintedBlocks };
      paintDiagnostics.push(...warnDiagnostics);
    }
  }

  const mdast = parseMarkdown(content);
  const transformDiagnostics: Diagnostic[] = [];
  let hast = transformToHast(mdast, transformDiagnostics);
  hast = injectDividerDecorations(hast, effectiveTheme);
  hast = sanitizeHast(hast, wechatFlowSanitizeSchema);

  const rules = options?.rules !== undefined ? options.rules : builtinRules;
  const {
    hast: authoringHast,
    diagnostics: authoringDiagnostics,
    nodeChangeRecords: authoringNodeChangeRecords,
  } = applyRuleset(hast, rules, "authoring");
  hast = authoringHast;

  if (options?.injectNodeIds) {
    hast = injectNodeIds(hast);
  }

  const themeTokens = effectiveTheme?.blocks;
  const styledHast = inlineStyle(hast, themeTokens, effectiveTheme?.tokens);
  let decorated = contextAwareRender(styledHast, effectiveTheme);
  decorated = injectDecorations(decorated, effectiveTheme);

  const ccDiagnostics: Diagnostic[] = [];
  const customCss = options?.customCss;
  const afterCustomCss =
    typeof customCss === "string" && customCss.trim() !== ""
      ? applyCustomCss(decorated, customCss, ccDiagnostics)
      : decorated;

  const {
    hast: outputHast,
    diagnostics: outputDiagnostics,
    nodeChangeRecords: outputNodeChangeRecords,
  } = applyRuleset(afterCustomCss, rules, "output");

  const nightRiskIssues = collectNightRiskIssues(outputHast);
  const html = serializeHast(outputHast);

  const allDiagnostics = [
    ...paintDiagnostics,
    ...transformDiagnostics,
    ...authoringDiagnostics,
    ...ccDiagnostics,
    ...outputDiagnostics,
  ];
  const nodeChangeRecords = [...authoringNodeChangeRecords, ...outputNodeChangeRecords];

  return {
    html,
    diagnostics: allDiagnostics,
    rulesetVersion: getRulesetVersion(),
    themeVersion: effectiveTheme?.meta?.version ?? "0.0.0",
    postPaste: false,
    coreVersion,
    report: {
      diagnostics: allDiagnostics,
      nodeChangeRecords,
      nightRiskIssues,
      versionTriple: {
        rulesetVersion: getRulesetVersion(),
        coreVersion,
        themeVersion: effectiveTheme?.meta?.version ?? "0.0.0",
      },
    },
  };
}
