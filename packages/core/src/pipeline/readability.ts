import type { NightRiskEntry } from "@wechat-flow/contracts";
import { WCAG_AA_MIN_RATIO, wcagContrast } from "@wechat-flow/palette";
import type { Element, Root as HastRoot } from "hast";

export interface CollectNightRiskIssuesOptions {
  defaultBackground?: string;
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{3,8}$/;

function parseDeclarations(style: string): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const chunk of style.split(";")) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;
    const prop = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();
    if (prop && value) {
      declarations.set(prop, value);
    }
  }
  return declarations;
}

function extractFirstHexToken(value: string): string | undefined {
  const match = value.match(/#[0-9a-fA-F]{3,8}/);
  return match ? match[0] : undefined;
}

function isHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value);
}

function normalizeHex(hex: string): string {
  const digits = hex.slice(1);
  if (digits.length === 3) {
    return `#${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}`;
  }
  if (digits.length === 8 || digits.length === 4) {
    const rgbLength = digits.length === 8 ? 6 : 3;
    return normalizeHex(`#${digits.slice(0, rgbLength)}`);
  }
  return hex;
}

function getElementStyle(node: Element): Map<string, string> | undefined {
  const style = node.properties?.style;
  if (typeof style !== "string" || style.trim().length === 0) {
    return undefined;
  }
  return parseDeclarations(style);
}

function findBackgroundHex(ancestors: Element[]): string | undefined {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const declarations = getElementStyle(ancestors[i]);
    if (!declarations) continue;

    const bgColor = declarations.get("background-color");
    if (bgColor) {
      const token = extractFirstHexToken(bgColor);
      if (token && isHexColor(token)) {
        return token;
      }
    }

    const background = declarations.get("background");
    if (background) {
      const token = extractFirstHexToken(background);
      if (token && isHexColor(token)) {
        return token;
      }
    }
  }
  return undefined;
}

function walk(
  node: HastRoot | Element,
  ancestors: Element[],
  defaultBackground: string,
  seenSelectors: Set<string>,
  entries: NightRiskEntry[]
): void {
  if (node.type === "element") {
    const declarations = getElementStyle(node);
    const foreground = declarations?.get("color");

    if (foreground && isHexColor(foreground)) {
      const selfAndAncestors = [...ancestors, node];
      const backgroundHex = findBackgroundHex(selfAndAncestors) ?? defaultBackground;

      const fgNormalized = normalizeHex(foreground);
      const bgNormalized = isHexColor(backgroundHex)
        ? normalizeHex(backgroundHex)
        : defaultBackground;

      const ratio = wcagContrast(fgNormalized, bgNormalized);

      if (ratio < WCAG_AA_MIN_RATIO) {
        const nodeSelector = node.tagName ?? "unknown";
        if (!seenSelectors.has(nodeSelector)) {
          seenSelectors.add(nodeSelector);
          entries.push({
            nodeSelector,
            contrastRatio: ratio,
            foreground,
            background: backgroundHex,
            suggestion: `提高前景色与背景色对比度至 4.5:1（当前 ${ratio.toFixed(2)}:1）`,
          });
        }
      }
    }

    const nextAncestors = [...ancestors, node];
    for (const child of node.children) {
      if (child.type === "element") {
        walk(child as Element, nextAncestors, defaultBackground, seenSelectors, entries);
      }
    }
    return;
  }

  for (const child of node.children) {
    if (child.type === "element") {
      walk(child as Element, ancestors, defaultBackground, seenSelectors, entries);
    }
  }
}

export function collectNightRiskIssues(
  styledHast: HastRoot,
  options?: CollectNightRiskIssuesOptions
): NightRiskEntry[] {
  const defaultBackground = options?.defaultBackground ?? "#ffffff";
  const entries: NightRiskEntry[] = [];
  const seenSelectors = new Set<string>();

  walk(styledHast, [], defaultBackground, seenSelectors, entries);

  return entries;
}
