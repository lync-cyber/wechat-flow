import { createRequire } from "node:module";
import type { Element, Root as HastRoot, Properties } from "hast";
import { sortedEntries } from "../utils/deterministic.ts";
import { filterCssAttrs } from "./css-attr-filter.ts";

const require = createRequire(import.meta.url);
const juice = require("juice") as {
  inlineContent: (html: string, css: string, opts?: Record<string, unknown>) => string;
};

export interface TokenDictionary {
  [selector: string]: Record<string, string>;
}

const DEFAULT_TOKENS: TokenDictionary = {
  h1: {
    "font-size": "22px",
    "font-weight": "bold",
    color: "#1a1a1a",
    "line-height": "1.4",
    margin: "0 0 16px",
  },
  h2: {
    "font-size": "18px",
    "font-weight": "bold",
    color: "#1a1a1a",
    "line-height": "1.4",
    margin: "0 0 12px",
  },
  h3: {
    "font-size": "16px",
    "font-weight": "bold",
    color: "#1a1a1a",
    "line-height": "1.4",
    margin: "0 0 10px",
  },
  p: {
    "font-size": "15px",
    color: "#333333",
    "line-height": "1.75",
    margin: "0 0 12px",
  },
  strong: {
    "font-weight": "bold",
    color: "#111111",
  },
  em: {
    "font-style": "italic",
  },
  code: {
    "font-family": "monospace",
    background: "#f5f5f5",
    padding: "2px 4px",
    "border-radius": "3px",
    "font-size": "13px",
  },
  blockquote: {
    "border-left": "4px solid #e0e0e0",
    padding: "8px 12px",
    margin: "0 0 12px",
    color: "#666666",
  },
};

function buildCssString(tokens: TokenDictionary): string {
  return sortedEntries(tokens)
    .map(([selector, props]) => {
      const declarations = sortedEntries(props)
        .map(([prop, val]) => `${prop}: ${val}`)
        .join("; ");
      return `${selector} { ${declarations} }`;
    })
    .join("\n");
}

function buildPlaceholderHtml(tokens: TokenDictionary): string {
  const tags = sortedEntries(tokens).map(([selector]) => {
    return `<${selector}>placeholder</${selector}>`;
  });
  return `<div>${tags.join("")}</div>`;
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

function applyInlineStyles(
  node: HastRoot | Element,
  styleMap: Map<string, string>
): HastRoot | Element {
  if (node.type === "element") {
    const el = node as Element;
    const tagStyle = styleMap.get(el.tagName);
    const propsWithoutClass = stripClassFromProperties(el.properties ?? {});

    let mergedStyle = tagStyle ?? "";
    const existingStyle = propsWithoutClass.style;
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

    return {
      ...el,
      properties: newProps,
      children: el.children.map((child) => {
        if (child.type === "element") {
          return applyInlineStyles(child as Element, styleMap) as Element;
        }
        return child;
      }),
    };
  }

  return {
    ...node,
    children: node.children.map((child) => {
      if (child.type === "element") {
        return applyInlineStyles(child as Element, styleMap) as Element;
      }
      return child;
    }),
  };
}

function buildStyleMap(tokens: TokenDictionary): Map<string, string> {
  const cssString = buildCssString(tokens);
  const placeholderHtml = buildPlaceholderHtml(tokens);
  const inlined = juice.inlineContent(placeholderHtml, cssString, {
    removeStyleTags: true,
    preserveMediaQueries: false,
    applyWidthAttributes: false,
    applyAttributesTableElements: false,
  });

  const styleMap = new Map<string, string>();
  const attrRegex = /<([\w]+)[^>]*\sstyle="([^"]+)"/g;
  let execResult = attrRegex.exec(inlined);
  while (execResult !== null) {
    const tag = execResult[1].toLowerCase();
    const styleVal = execResult[2];
    if (!styleMap.has(tag)) {
      styleMap.set(tag, styleVal);
    }
    execResult = attrRegex.exec(inlined);
  }
  return styleMap;
}

export function inlineStyle(hast: HastRoot, themeTokens?: TokenDictionary): HastRoot {
  const tokens = themeTokens ?? DEFAULT_TOKENS;
  const styleMap = buildStyleMap(tokens);
  return applyInlineStyles(hast, styleMap) as HastRoot;
}
