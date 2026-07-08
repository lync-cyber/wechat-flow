export const WECHAT_PASTE_UNSAFE_TAGS: ReadonlySet<string> = new Set(["div"]);

export const WECHAT_PASTE_STRIPPED_STYLE_PROPS: ReadonlySet<string> = new Set([
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "z-index",
  "float",
]);
