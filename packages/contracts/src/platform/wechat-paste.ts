export const WECHAT_PASTE_UNSAFE_TAGS: ReadonlySet<string> = new Set(["div"]);

export const FORBIDDEN_CSS_PROPS: ReadonlySet<string> = new Set([
  "font-family",
  "position",
  "float",
]);

export const FORBIDDEN_DISPLAY_VALUES: ReadonlySet<string> = new Set([
  "flex",
  "inline-flex",
  "grid",
  "inline-grid",
]);

export const FORBIDDEN_POSITION_PROPS: ReadonlySet<string> = new Set([
  "top",
  "right",
  "bottom",
  "left",
  "z-index",
]);

export const HARD_REMOVE_TAGS: ReadonlySet<string> = new Set([
  "script",
  "style",
  "link",
  "meta",
  "base",
  "title",
  "head",
  "html",
  "noscript",
]);

export const FORBIDDEN_VALUE_PATTERNS: ReadonlySet<string> = new Set([
  "-webkit-",
  "@media",
  "@keyframes",
  ":hover",
  ":active",
]);

export const FORBIDDEN_VALUE_PATTERN_EXCEPTIONS: ReadonlySet<string> = new Set([
  "-webkit-text-emphasis",
  "print-color-adjust",
  "overflow-scrolling",
  "-webkit-overflow-scrolling",
]);

export const IFRAME_SRC_ALLOW: ReadonlySet<string> = new Set(["v.qq.com", "mp.weixin.qq.com"]);

export const NEAR_WHITE = "#fefefe";

export function isForbiddenCssValue(value: string): boolean {
  let stripped = value.toLowerCase();
  for (const exception of FORBIDDEN_VALUE_PATTERN_EXCEPTIONS) {
    const exceptionLower = exception.toLowerCase();
    stripped = stripped.split(`-webkit-${exceptionLower}`).join("");
  }
  for (const exception of FORBIDDEN_VALUE_PATTERN_EXCEPTIONS) {
    stripped = stripped.split(exception.toLowerCase()).join("");
  }
  for (const pattern of FORBIDDEN_VALUE_PATTERNS) {
    if (stripped.includes(pattern.toLowerCase())) return true;
  }
  return false;
}

export const WECHAT_PASTE_STRIPPED_STYLE_PROPS: ReadonlySet<string> = new Set([
  ...FORBIDDEN_POSITION_PROPS,
  "position",
  "float",
]);
