import type { Diagnostic } from "@wechat-flow/contracts";
import type { Element, Root as HastRoot } from "hast";
import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";
import juiceClient from "juice";
import { isWhitelistedProperty } from "../registry/css-property-whitelist.ts";
import { filterCssAttrs } from "./css-attr-filter.ts";

function parseDeclarations(styleValue: string): Array<{ prop: string; value: string }> {
  const result: Array<{ prop: string; value: string }> = [];
  const parts = styleValue.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed === "") continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const prop = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    if (prop && value) {
      result.push({ prop, value });
    }
  }
  return result;
}

function collectInlineStyles(hast: HastRoot): Map<Element, string> {
  const map = new Map<Element, string>();

  function walk(node: HastRoot | Element): void {
    if (node.type === "element") {
      const el = node as Element;
      const style = el.properties?.style;
      if (typeof style === "string" && style.trim() !== "") {
        map.set(el, style);
      }
      for (const child of el.children) {
        if (child.type === "element") walk(child as Element);
      }
    } else {
      for (const child of node.children) {
        if (child.type === "element") walk(child as Element);
      }
    }
  }

  walk(hast);
  return map;
}

function stripInlineStyles(hast: HastRoot): HastRoot {
  function walk(node: HastRoot | Element): HastRoot | Element {
    if (node.type === "element") {
      const el = node as Element;
      return {
        ...el,
        properties: { ...el.properties, style: undefined },
        children: el.children.map((child) =>
          child.type === "element" ? (walk(child as Element) as Element) : child
        ),
      };
    }
    return {
      ...node,
      children: node.children.map((child) =>
        child.type === "element" ? (walk(child as Element) as Element) : child
      ),
    };
  }
  return walk(hast) as HastRoot;
}

function filterDeclarations(
  styleValue: string,
  diagnostics: Diagnostic[],
  source: "custom-css"
): string {
  const xssFiltered = filterCssAttrs(styleValue);
  const declarations = parseDeclarations(xssFiltered);
  const kept: string[] = [];

  for (const { prop, value } of declarations) {
    if (isWhitelistedProperty(prop)) {
      kept.push(`${prop}: ${value}`);
    } else {
      diagnostics.push({
        source,
        severity: "warning",
        ruleId: "custom-css-rejected",
        message: `declaration '${prop}: ${value}' rejected: not in css-attr-filter whitelist`,
      });
    }
  }

  return kept.join("; ");
}

function mergeStyles(existing: string | undefined, juiceStyle: string): string {
  // existing styles first (lower priority); juice styles last (higher priority on duplicates)
  if (!existing || existing.trim() === "") return juiceStyle;
  if (!juiceStyle) return existing;
  return `${existing}; ${juiceStyle}`;
}

function applyMergedStyles(
  hast: HastRoot,
  juicedHast: HastRoot,
  existingStyles: Map<Element, string>,
  diagnostics: Diagnostic[]
): HastRoot {
  // Build a parallel walk: juicedHast has the juice-inlined styles,
  // we need to merge with original inline styles per element (by tree position)
  function walkPair(original: HastRoot | Element, juiced: HastRoot | Element): HastRoot | Element {
    if (original.type === "element") {
      const origEl = original as Element;
      const juicedEl = juiced as Element;

      const origInline = existingStyles.get(origEl);
      const juicedStyle =
        typeof juicedEl.properties?.style === "string" ? juicedEl.properties.style : "";

      // Filter juice-contributed style (whitelist check + XSS)
      const filteredJuice = juicedStyle
        ? filterDeclarations(juicedStyle, diagnostics, "custom-css")
        : "";

      const merged = mergeStyles(origInline, filteredJuice);

      const newChildren: Element["children"] = [];
      for (let i = 0; i < origEl.children.length; i++) {
        const oc = origEl.children[i];
        const jc = juicedEl.children[i];
        if (oc && oc.type === "element" && jc && jc.type === "element") {
          newChildren.push(walkPair(oc as Element, jc as Element) as Element);
        } else if (oc) {
          newChildren.push(oc);
        }
      }

      return {
        ...origEl,
        properties: { ...origEl.properties, style: merged || undefined },
        children: newChildren,
      };
    }

    // Root node
    const origRoot = original as HastRoot;
    const juicedRoot = juiced as HastRoot;
    const newChildren: HastRoot["children"] = [];
    for (let i = 0; i < origRoot.children.length; i++) {
      const oc = origRoot.children[i];
      const jc = juicedRoot.children[i];
      if (oc && oc.type === "element" && jc && jc.type === "element") {
        newChildren.push(walkPair(oc as Element, jc as Element) as Element);
      } else if (oc) {
        newChildren.push(oc);
      }
    }
    return { ...origRoot, children: newChildren };
  }

  return walkPair(hast, juicedHast) as HastRoot;
}

export function applyCustomCss(html: string, customCss: string, diagnostics: Diagnostic[]): string {
  // Parse original HTML preserving existing inline styles
  const origHast = fromHtml(html, { fragment: true }) as HastRoot;

  // Collect existing inline styles before stripping
  const existingStyles = collectInlineStyles(origHast);

  // Strip inline styles so juice can apply customCss without losing to inline specificity
  const strippedHast = stripInlineStyles(origHast);
  const strippedHtml = toHtml(strippedHast);

  // Run juice cascade on stripped HTML
  const juicedHtml = juiceClient.inlineContent(strippedHtml, customCss);
  const juicedHast = fromHtml(juicedHtml, { fragment: true }) as HastRoot;

  // Merge: existing inline styles (lower priority) + juice styles (higher priority)
  // Then whitelist-filter the juice-contributed declarations
  const mergedHast = applyMergedStyles(origHast, juicedHast, existingStyles, diagnostics);

  return toHtml(mergedHast);
}
