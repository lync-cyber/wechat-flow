import type { ThemeBlocks, ThemeDefinition } from "@wechat-flow/contracts";

function mergeBlocks(
  parentBlocks: ThemeBlocks,
  deltaBlocks: ThemeBlocks | undefined,
  valueReplacement: Map<string, string>
): ThemeBlocks {
  const merged: ThemeBlocks = {};

  const allSelectors = new Set([...Object.keys(parentBlocks), ...Object.keys(deltaBlocks ?? {})]);

  for (const selector of allSelectors) {
    const parentVariants = parentBlocks[selector] ?? {};
    const deltaVariants = deltaBlocks?.[selector] ?? {};

    const allVariantIds = new Set([...Object.keys(parentVariants), ...Object.keys(deltaVariants)]);

    const mergedVariants: Record<string, Record<string, string>> = {};
    for (const variantId of allVariantIds) {
      const parentProps = parentVariants[variantId] ?? {};
      const deltaProps = deltaVariants[variantId] ?? {};
      mergedVariants[variantId] = { ...parentProps, ...deltaProps };
    }

    merged[selector] = mergedVariants;
  }

  if (valueReplacement.size === 0) {
    return merged;
  }

  const replaced: ThemeBlocks = {};
  for (const [selector, variants] of Object.entries(merged)) {
    const newVariants: Record<string, Record<string, string>> = {};
    for (const [variantId, props] of Object.entries(variants)) {
      const newProps: Record<string, string> = {};
      for (const [cssProp, cssValue] of Object.entries(props)) {
        newProps[cssProp] = valueReplacement.get(cssValue) ?? cssValue;
      }
      newVariants[variantId] = newProps;
    }
    replaced[selector] = newVariants;
  }

  return replaced;
}

export function mergeDelta(
  themeId: string,
  lookupRaw: (id: string) => ThemeDefinition | undefined
): ThemeDefinition | undefined {
  const theme = lookupRaw(themeId);
  if (!theme) return undefined;

  if (!theme.extends) {
    return theme;
  }

  const parent = mergeDelta(theme.extends, lookupRaw);
  if (!parent) {
    return theme;
  }

  const mergedTokens: Record<string, string> = {
    ...parent.tokens,
    ...(theme.delta?.tokens ?? {}),
  };

  const valueReplacement = new Map<string, string>();
  for (const [tokenPath, newValue] of Object.entries(theme.delta?.tokens ?? {})) {
    const oldValue = parent.tokens[tokenPath];
    if (oldValue !== undefined && oldValue !== newValue) {
      valueReplacement.set(oldValue, newValue);
    }
  }

  const parentBlocks = parent.blocks ?? {};
  const mergedBlocks = mergeBlocks(parentBlocks, theme.delta?.blocks, valueReplacement);

  return {
    ...parent,
    ...theme,
    tokens: mergedTokens,
    blocks: mergedBlocks,
    paintable: theme.delta?.paintable ?? theme.paintable ?? parent.paintable,
    assets: theme.delta?.assets ?? theme.assets ?? parent.assets,
  };
}
