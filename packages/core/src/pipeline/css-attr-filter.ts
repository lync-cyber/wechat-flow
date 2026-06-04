const BLOCK_PATTERNS: RegExp[] = [
  /expression\s*\(/i,
  /url\s*\(\s*javascript:/i,
  /\bbehavior\s*:/i,
  /@import\b/i,
];

export function filterCssAttrs(cssValue: string): string {
  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.test(cssValue)) {
      return "";
    }
  }
  return cssValue;
}
