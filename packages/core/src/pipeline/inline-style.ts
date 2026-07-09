import type { ThemeTokens } from "@wechat-flow/contracts";
import type { Element, Root as HastRoot, Properties } from "hast";
import { describeBlock } from "../registry/block.ts";
import { getBlockBaseStyle } from "../registry/variant.ts";
import { sortedEntries } from "../utils/deterministic.ts";
import { filterCssAttrs } from "./css-attr-filter.ts";

export interface BlockStyleTable {
  [selector: string]: Record<string, Record<string, string>>;
}

const DEFAULT_TOKENS: BlockStyleTable = {
  h1: {
    default: {
      "font-size": "22px",
      "font-weight": "bold",
      color: "#1a1a1a",
      "line-height": "1.4",
      margin: "0 0 16px",
    },
  },
  h2: {
    default: {
      "font-size": "18px",
      "font-weight": "bold",
      color: "#1a1a1a",
      "line-height": "1.4",
      margin: "0 0 12px",
    },
  },
  h3: {
    default: {
      "font-size": "16px",
      "font-weight": "bold",
      color: "#1a1a1a",
      "line-height": "1.4",
      margin: "0 0 10px",
    },
  },
  p: {
    default: {
      "font-size": "15px",
      color: "#333333",
      "line-height": "1.75",
      margin: "0 0 12px",
    },
  },
  strong: {
    default: {
      "font-weight": "bold",
      color: "#111111",
    },
  },
  em: {
    default: {
      "font-style": "italic",
    },
  },
  code: {
    default: {
      "font-family": "monospace",
      background: "#f5f5f5",
      padding: "2px 4px",
      "border-radius": "3px",
      "font-size": "13px",
    },
  },
  blockquote: {
    default: {
      "border-left": "4px solid #e0e0e0",
      padding: "8px 12px",
      margin: "0 0 12px",
      color: "#666666",
    },
  },
};

// Resolution fallback for slot `var(--token)` placeholders when no theme/token is registered.
const FALLBACK_SLOT_TOKENS: Record<string, string> = {
  "--color-brand": "#2D5A4E",
  "--font-family-heading":
    "'LXGW WenKai', 'Source Han Serif CN', 'Noto Serif CJK SC', Georgia, serif",
  "--color-text-muted": "#78716C",
};

const TOKEN_PLACEHOLDER_PATTERN = /var\((--[\w-]+)\)/g;

// Mirrors clamp-line-height's readability floor (packages/ruleset/src/rules/builtin/clamp-line-height.ts).
// Decorative slot line-heights below this floor get a transient marker so the output-stage clamp
// rule can exempt them instead of forcing body-text line-height onto single-glyph decorations.
const LINE_HEIGHT_READABILITY_FLOOR = 1.2;
const LINE_HEIGHT_EXEMPT_ATTR = "data-lh-exempt";

function isBelowLineHeightFloor(value: string | undefined): boolean {
  if (typeof value !== "string") return false;
  const num = Number.parseFloat(value);
  return !Number.isNaN(num) && num < LINE_HEIGHT_READABILITY_FLOOR;
}

function resolveTokenPlaceholder(value: string, designTokens?: ThemeTokens): string {
  if (!value.includes("var(")) return value;
  return value.replace(TOKEN_PLACEHOLDER_PATTERN, (placeholder, tokenName: string) => {
    return designTokens?.[tokenName] ?? FALLBACK_SLOT_TOKENS[tokenName] ?? placeholder;
  });
}

function resolveSlotDeclarations(
  declarations: Record<string, string>,
  designTokens?: ThemeTokens
): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const [prop, val] of Object.entries(declarations)) {
    resolved[prop] = resolveTokenPlaceholder(val, designTokens);
  }
  return resolved;
}

function getBlockSlotStyle(
  blockId: string,
  variantId: string,
  slot: string,
  designTokens?: ThemeTokens
): Record<string, string> {
  const def = describeBlock(blockId);
  const variant = def?.variants.find((v) => v.id === variantId);
  const raw = variant?.baseStyle?.[slot] ?? {};
  return resolveSlotDeclarations(raw, designTokens);
}

function stripClassFromProperties(props: Properties): Properties {
  const next: Properties = {};
  for (const [key, val] of Object.entries(props)) {
    if (key !== "class" && key !== "className") {
      next[key] = val;
    }
  }
  return next;
}

function serializeDeclarations(declarations: Record<string, string>): string {
  return sortedEntries(declarations)
    .map(([prop, val]) => `${prop}: ${val}`)
    .join("; ");
}

interface AmbientBlockContext {
  blockId: string;
  variantId: string;
  inherited: Record<string, string>;
}

const INHERITABLE_PROPS = [
  "text-align",
  "color",
  "font-size",
  "line-height",
  "font-family",
  "letter-spacing",
] as const;

function extractInheritedStyle(merged: Record<string, string>): Record<string, string> {
  const inherited: Record<string, string> = {};
  for (const prop of INHERITABLE_PROPS) {
    if (prop in merged) {
      inherited[prop] = merged[prop];
    }
  }
  return inherited;
}

function applyInlineStyles(
  node: HastRoot | Element,
  styleMap: Map<string, string>,
  themeTokens: BlockStyleTable,
  isEvenBodyRow = false,
  ambientBlock?: AmbientBlockContext,
  designTokens?: ThemeTokens
): HastRoot | Element {
  if (node.type === "element") {
    const el = node as Element;
    const props = el.properties ?? {};
    const propsWithoutClass = stripClassFromProperties(props);

    let tagStyle: string;
    let containerInherited: Record<string, string> | undefined;
    let slotLineHeightExempt = false;

    const blockSlot = propsWithoutClass["data-block-slot"];
    const dataBlock = propsWithoutClass["data-block"];
    if (typeof blockSlot === "string" && blockSlot.length > 0 && ambientBlock) {
      const slotStyle = getBlockSlotStyle(
        ambientBlock.blockId,
        ambientBlock.variantId,
        blockSlot,
        designTokens
      );
      tagStyle = Object.keys(slotStyle).length > 0 ? serializeDeclarations(slotStyle) : "";
      slotLineHeightExempt = isBelowLineHeightFloor(slotStyle["line-height"]);
    } else if (typeof dataBlock === "string" && dataBlock.length > 0) {
      // Container block path: L1 ⊕ L2
      const variantId =
        typeof propsWithoutClass["data-variant"] === "string"
          ? propsWithoutClass["data-variant"]
          : "default";

      const l1 = getBlockBaseStyle(dataBlock, variantId);
      const l2 = themeTokens[dataBlock]?.[variantId];

      const merged: Record<string, string> = resolveSlotDeclarations(
        { ...l1, ...(l2 ?? {}) },
        designTokens
      );
      if (propsWithoutClass["data-block-slot-last"] === "true" && "margin-bottom" in merged) {
        merged["margin-bottom"] = "0";
      }
      tagStyle = Object.keys(merged).length > 0 ? serializeDeclarations(merged) : "";
      containerInherited = extractInheritedStyle(merged);
    } else {
      // Tag path: byte-identical when no container ambient typography applies
      const base = themeTokens[el.tagName]?.default;
      const evenOverride = isEvenBodyRow ? themeTokens[el.tagName]?.even : undefined;
      const inherited = ambientBlock?.inherited;
      const hasInherited = inherited !== undefined && Object.keys(inherited).length > 0;
      if (evenOverride || hasInherited) {
        const merged: Record<string, string> = {
          ...(base ?? {}),
          ...(evenOverride ?? {}),
          ...(hasInherited ? inherited : {}),
        };
        tagStyle = Object.keys(merged).length > 0 ? serializeDeclarations(merged) : "";
      } else {
        tagStyle = styleMap.get(el.tagName) ?? "";
      }
    }

    const existingStyle = propsWithoutClass.style;
    let mergedStyle = tagStyle;
    if (typeof existingStyle === "string" && existingStyle.trim().length > 0) {
      mergedStyle = mergedStyle ? `${mergedStyle}; ${existingStyle}` : existingStyle;
    }

    const filteredStyle = mergedStyle ? filterCssAttrs(mergedStyle) : "";

    const newProps: Properties = { ...propsWithoutClass };
    if (typeof blockSlot === "string" && blockSlot.length > 0) {
      newProps["data-block-slot"] = undefined;
    }
    if ("data-block-slot-last" in newProps) {
      newProps["data-block-slot-last"] = undefined;
    }
    if (slotLineHeightExempt) {
      newProps[LINE_HEIGHT_EXEMPT_ATTR] = "true";
    }
    if (filteredStyle) {
      newProps.style = filteredStyle;
    } else {
      newProps.style = undefined;
    }

    const isTbody = el.tagName === "tbody";
    let bodyRowCounter = 0;

    const childAmbientBlock: AmbientBlockContext | undefined =
      typeof dataBlock === "string" && dataBlock.length > 0
        ? {
            blockId: dataBlock,
            variantId:
              typeof propsWithoutClass["data-variant"] === "string"
                ? propsWithoutClass["data-variant"]
                : "default",
            inherited: containerInherited ?? {},
          }
        : ambientBlock;

    return {
      ...el,
      properties: newProps,
      children: el.children.map((child) => {
        if (child.type === "element") {
          const childEl = child as Element;
          let childIsEvenRow = isEvenBodyRow;
          if (isTbody && childEl.tagName === "tr") {
            childIsEvenRow = bodyRowCounter % 2 === 1;
            bodyRowCounter += 1;
          }
          return applyInlineStyles(
            childEl,
            styleMap,
            themeTokens,
            childIsEvenRow,
            childAmbientBlock,
            designTokens
          ) as Element;
        }
        return child;
      }),
    };
  }

  return {
    ...node,
    children: node.children.map((child) => {
      if (child.type === "element") {
        return applyInlineStyles(
          child as Element,
          styleMap,
          themeTokens,
          isEvenBodyRow,
          ambientBlock,
          designTokens
        ) as Element;
      }
      return child;
    }),
  };
}

function buildStyleMap(tokens: BlockStyleTable): Map<string, string> {
  const styleMap = new Map<string, string>();
  for (const [selector, variants] of sortedEntries(tokens)) {
    const props = variants.default;
    if (!props) continue;
    const declarations = sortedEntries(props)
      .map(([prop, val]) => `${prop}: ${val}`)
      .join("; ");
    styleMap.set(selector, declarations);
  }
  return styleMap;
}

export function inlineStyle(
  hast: HastRoot,
  themeTokens?: BlockStyleTable,
  designTokens?: ThemeTokens
): HastRoot {
  const tokens = themeTokens ?? DEFAULT_TOKENS;
  const styleMap = buildStyleMap(tokens);
  return applyInlineStyles(hast, styleMap, tokens, false, undefined, designTokens) as HastRoot;
}
