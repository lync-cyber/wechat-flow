import type { Element, Root as HastRoot, Properties } from "hast";
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

function applyInlineStyles(
  node: HastRoot | Element,
  styleMap: Map<string, string>,
  themeTokens: BlockStyleTable,
  isEvenBodyRow = false
): HastRoot | Element {
  if (node.type === "element") {
    const el = node as Element;
    const props = el.properties ?? {};
    const propsWithoutClass = stripClassFromProperties(props);

    let tagStyle: string;

    const dataBlock = propsWithoutClass["data-block"];
    if (typeof dataBlock === "string" && dataBlock.length > 0) {
      // Container block path: L1 ⊕ L2
      const variantId =
        typeof propsWithoutClass["data-variant"] === "string"
          ? propsWithoutClass["data-variant"]
          : "default";

      const l1 = getBlockBaseStyle(dataBlock, variantId);
      const l2 = themeTokens[dataBlock]?.[variantId];

      const merged: Record<string, string> = { ...l1, ...(l2 ?? {}) };
      tagStyle = Object.keys(merged).length > 0 ? serializeDeclarations(merged) : "";
    } else {
      // Tag path: existing behaviour, byte-identical
      const base = themeTokens[el.tagName]?.default;
      const evenOverride = isEvenBodyRow ? themeTokens[el.tagName]?.even : undefined;
      if (evenOverride) {
        const merged = { ...(base ?? {}), ...evenOverride };
        tagStyle = serializeDeclarations(merged);
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
    if (filteredStyle) {
      newProps.style = filteredStyle;
    } else {
      newProps.style = undefined;
    }

    const isTbody = el.tagName === "tbody";
    let bodyRowCounter = 0;

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
          return applyInlineStyles(childEl, styleMap, themeTokens, childIsEvenRow) as Element;
        }
        return child;
      }),
    };
  }

  return {
    ...node,
    children: node.children.map((child) => {
      if (child.type === "element") {
        return applyInlineStyles(child as Element, styleMap, themeTokens, isEvenBodyRow) as Element;
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

export function inlineStyle(hast: HastRoot, themeTokens?: BlockStyleTable): HastRoot {
  const tokens = themeTokens ?? DEFAULT_TOKENS;
  const styleMap = buildStyleMap(tokens);
  return applyInlineStyles(hast, styleMap, tokens) as HastRoot;
}
