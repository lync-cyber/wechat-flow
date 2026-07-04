const BLOCK_GLYPHS: Record<string, string> = {
  "advert-card": "▣",
  announcement: "◉",
  audio: "♪",
  "author-card": "◐",
  callout: "▢",
  card: "▭",
  citation: "„",
  "code-block": "⌗",
  compare: "⇄",
  "definition-list": "≔",
  dialog: "◒",
  disclaimer: "§",
  divider: "―",
  "footer-cta": "⤓",
  footnote: "†",
  gallery: "▦",
  heading: "H",
  "highlight-block": "▰",
  image: "▨",
  "image-caption": "▧",
  "kpi-card": "◫",
  list: "☰",
  "miniprogram-card": "◧",
  paragraph: "¶",
  "publication-skeleton": "▥",
  "pull-quote": "❞",
  qa: "?",
  qrcode: "▩",
  quote: "❝",
  "reading-time": "◷",
  recommendation: "★",
  "related-cards": "⧉",
  "social-cta": "@",
  steps: "①",
  "subscribe-cta": "✉",
  table: "▤",
  timeline: "⋮",
  "tip-grid": "⊞",
  video: "▶",
  warning: "⚠",
};

const BLOCK_FALLBACK_GLYPH = "▫";
const INLINE_FALLBACK_GLYPH = "∙";

export function blockGlyph(id: string, type: "block" | "inline" = "block"): string {
  return BLOCK_GLYPHS[id] ?? (type === "inline" ? INLINE_FALLBACK_GLYPH : BLOCK_FALLBACK_GLYPH);
}
