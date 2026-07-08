const BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "dd",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
]);

const TAG_RE = /<(\/)?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g;

function decodeEntities(text: string): string {
  return text
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#0*39;|&#x0*27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&amp;/gi, "&");
}

export function extractPlainText(html: string): string {
  const withoutScriptsAndStyles = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  const lines: string[] = [];
  let buffer = "";
  let cursor = 0;

  const flush = (): void => {
    const trimmed = decodeEntities(buffer).trim();
    if (trimmed.length > 0) {
      lines.push(trimmed);
    }
    buffer = "";
  };

  for (const match of withoutScriptsAndStyles.matchAll(TAG_RE)) {
    buffer += withoutScriptsAndStyles.slice(cursor, match.index);
    cursor = match.index + match[0].length;

    const tag = match[2].toLowerCase();
    if (tag === "br" || BLOCK_TAGS.has(tag)) {
      flush();
    }
  }
  buffer += withoutScriptsAndStyles.slice(cursor);
  flush();

  return lines.join("\n");
}
