import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export interface TokenMismatch {
  tokenKey: string;
  penpotValue: string;
  codeValue: string;
}

export interface TokenDiffResult {
  mismatches: TokenMismatch[];
  comparedCount: number;
}

const EDITOR_TOKENS_CSS = "apps/editor/src/styles/tokens.css";
const PENPOT_TOKENS_JSON = "docs/design/tokens/penpot-tokens.json";

export function parseCssTokens(cssPath: string): Record<string, string> {
  const css = readFileSync(cssPath, "utf8");
  const root = css.match(/:root\s*\{([\s\S]*?)\}/);
  const body = root ? root[1] : css;
  const tokens: Record<string, string> = {};
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m = re.exec(body);
  while (m !== null) {
    tokens[m[1]] = m[2].replace(/\s+/g, " ").trim();
    m = re.exec(body);
  }
  return tokens;
}

function extractColor(v: string): string | null {
  const m = v.match(/#[0-9a-f]{3,8}/i);
  return m ? m[0] : null;
}

function normalize(key: string, raw: string): string {
  let s = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (key === "--color-brand-highlight-outline") {
    const c = extractColor(s);
    return c ? c.toLowerCase() : s;
  }
  if (/^#[0-9a-f]{3,8}$/.test(s)) return s;
  const scalar = s.match(/^(-?\d*\.?\d+)(px|ms|%)?$/);
  if (scalar) {
    const num = Number.parseFloat(scalar[1]);
    const unit = scalar[2] ?? "";
    return num === 0 ? "0" : `${num}${unit}`;
  }
  if (s.includes(",") && !s.includes("(")) {
    return s
      .split(",")
      .map((p) => p.trim().replace(/^["']|["']$/g, ""))
      .join(",");
  }
  s = s.replace(/\s+/g, "");
  s = s.replace(/(\d*\.\d*?)0+(?=\D|$)/g, "$1").replace(/\.(?=\D|$)/g, "");
  return s;
}

export function runTokenDiff(
  penpotTokensPath: string,
  editorUiTokens: Record<string, string>
): TokenDiffResult {
  const penpot = JSON.parse(readFileSync(penpotTokensPath, "utf8")) as Record<string, string>;
  const mismatches: TokenMismatch[] = [];
  let comparedCount = 0;
  for (const [key, penpotValue] of Object.entries(penpot)) {
    const codeValue = editorUiTokens[key];
    if (codeValue === undefined) continue;
    comparedCount++;
    if (normalize(key, penpotValue) !== normalize(key, codeValue)) {
      mismatches.push({ tokenKey: key, penpotValue, codeValue });
    }
  }
  return { mismatches, comparedCount };
}

function isMain(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return entry.endsWith("token-diff.ts");
  }
}

if (isMain()) {
  const editor = parseCssTokens(EDITOR_TOKENS_CSS);
  const result = runTokenDiff(PENPOT_TOKENS_JSON, editor);
  if (result.mismatches.length === 0) {
    process.stdout.write(
      `${JSON.stringify({ mismatches: [], comparedCount: result.comparedCount }, null, 2)}\n`
    );
    process.exit(0);
  }
  process.stderr.write(`${JSON.stringify({ mismatches: result.mismatches }, null, 2)}\n`);
  process.exit(1);
}
