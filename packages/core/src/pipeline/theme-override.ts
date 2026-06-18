import type { Diagnostic, ThemeBlocks, ThemeDefinition } from "@wechat-flow/contracts";
import { derivePalette } from "@wechat-flow/palette";

function getPaintableSet(paintable: ThemeDefinition["paintable"]): Set<string> {
  if (Array.isArray(paintable)) {
    return new Set(paintable);
  }
  return new Set<string>();
}

export function applyPaintToBlocks(
  theme: ThemeDefinition,
  paint: Record<string, string>
): { blocks: ThemeBlocks | undefined; warnDiagnostics: Diagnostic[] } {
  const paintableSet = getPaintableSet(theme.paintable);
  const warnDiagnostics: Diagnostic[] = [];

  const allowed: Record<string, string> = {};
  for (const [tokenPath, overrideValue] of Object.entries(paint)) {
    if (paintableSet.has(tokenPath)) {
      allowed[tokenPath] = overrideValue;
    } else {
      warnDiagnostics.push({
        severity: "warning",
        ruleId: "paint-token-not-paintable",
        message: `paint token '${tokenPath}' is not in theme paintable whitelist and was ignored`,
      });
    }
  }

  if (Object.keys(allowed).length === 0 || !theme.blocks) {
    return { blocks: theme.blocks, warnDiagnostics };
  }

  const valueReplacement = new Map<string, string>();
  for (const [tokenPath, overrideValue] of Object.entries(allowed)) {
    const originalTokenValue = theme.tokens[tokenPath];
    if (originalTokenValue !== undefined) {
      valueReplacement.set(originalTokenValue, overrideValue);
    }
  }

  if (valueReplacement.size === 0) {
    return { blocks: theme.blocks, warnDiagnostics };
  }

  const newBlocks: ThemeBlocks = {};
  for (const [selector, variants] of Object.entries(theme.blocks)) {
    const newVariants: Record<string, Record<string, string>> = {};
    for (const [variantId, props] of Object.entries(variants)) {
      const newProps: Record<string, string> = {};
      for (const [cssProp, cssValue] of Object.entries(props)) {
        newProps[cssProp] = valueReplacement.get(cssValue) ?? cssValue;
      }
      newVariants[variantId] = newProps;
    }
    newBlocks[selector] = newVariants;
  }

  return { blocks: newBlocks, warnDiagnostics };
}

export function applyBaseColorToBlocks(
  theme: ThemeDefinition,
  baseColor: string
): ThemeBlocks | undefined {
  if (!theme.blocks) return theme.blocks;

  const derived = derivePalette({ primary: baseColor });

  const valueReplacement = new Map<string, string>();
  for (const [tokenName, derivedValue] of Object.entries(derived)) {
    const originalTokenValue = theme.tokens[tokenName];
    if (originalTokenValue !== undefined && originalTokenValue !== derivedValue) {
      valueReplacement.set(originalTokenValue, derivedValue);
    }
  }

  if (valueReplacement.size === 0) return theme.blocks;

  const newBlocks: ThemeBlocks = {};
  for (const [selector, variants] of Object.entries(theme.blocks)) {
    const newVariants: Record<string, Record<string, string>> = {};
    for (const [variantId, props] of Object.entries(variants)) {
      const newProps: Record<string, string> = {};
      for (const [cssProp, cssValue] of Object.entries(props)) {
        newProps[cssProp] = valueReplacement.get(cssValue) ?? cssValue;
      }
      newVariants[variantId] = newProps;
    }
    newBlocks[selector] = newVariants;
  }

  return newBlocks;
}
