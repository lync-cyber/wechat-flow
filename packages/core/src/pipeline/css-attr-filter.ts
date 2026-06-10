const BLOCK_WHOLE_VALUE_PATTERNS: RegExp[] = [/expression\s*\(/i, /@import\b/i];

const BLOCK_DECLARATION_PATTERNS: RegExp[] = [
  /\bjavascript\s*:/i,
  /\bbehavior\s*:/i,
  /url\s*\(\s*javascript:/i,
  /-moz-binding\s*:/i,
];

/**
 * Normalizes CSS escape sequences so that bypass attempts like `j\61vascript:`
 * are resolved to their literal form before pattern matching.
 * Handles: backslash hex escapes `\XX...` (1-6 hex digits + optional whitespace),
 * CSS comments (comment-splitting bypass), and C0 control characters.
 */
function normalizeCssValue(value: string): string {
  // Strip CSS comments (comment-splitting bypass: `java/**/script:`)
  let normalized = value.replace(/\/\*[\s\S]*?\*\//g, "");
  // Decode CSS backslash hex escapes: \XXXXXX (1-6 hex digits) followed by optional whitespace
  normalized = normalized.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex: string) =>
    String.fromCodePoint(Number.parseInt(hex, 16))
  );
  // Strip remaining backslash escapes for non-hex chars (e.g. `\j` -> `j`)
  normalized = normalized.replace(/\\(.)/g, "$1");
  // Remove C0 control characters (U+0000 to U+001F) that could be used as separators
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional — stripping C0 control chars used as CSS bypass separators
  normalized = normalized.replace(/[\x00-\x1F]/g, "");
  return normalized;
}

export function filterCssAttrs(cssValue: string): string {
  const normalized = normalizeCssValue(cssValue);

  for (const pattern of BLOCK_WHOLE_VALUE_PATTERNS) {
    if (pattern.test(normalized)) {
      return "";
    }
  }

  const declarations = normalized.split(";");
  const safe: string[] = [];
  for (const decl of declarations) {
    const trimmed = decl.trim();
    if (trimmed === "") continue;
    let blocked = false;
    for (const pattern of BLOCK_DECLARATION_PATTERNS) {
      if (pattern.test(trimmed)) {
        blocked = true;
        break;
      }
    }
    if (!blocked) {
      safe.push(decl);
    }
  }
  return safe.join(";");
}
