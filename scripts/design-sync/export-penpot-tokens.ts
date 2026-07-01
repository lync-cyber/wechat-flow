import { existsSync, readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Penpot Token-* 变量组经交互式 Penpot MCP 只读查询导出为 penpot-tokens.json（POSIX 容器 fs
// 与宿主隔离，脚本进程无法直连插件上下文）；本脚本 gate 校验冻结 token 导出集非空且规模达标。

export interface TokenVerifyResult {
  path: string;
  exists: boolean;
  count: number;
  tokenKeys: string[];
  ok: boolean;
}

const PENPOT_TOKENS_JSON = "docs/design/tokens/penpot-tokens.json";
const MIN_TOKEN_COUNT = 60;

export function verifyPenpotTokens(
  jsonPath: string = PENPOT_TOKENS_JSON,
  minCount: number = MIN_TOKEN_COUNT
): TokenVerifyResult {
  if (!existsSync(jsonPath)) {
    return { path: jsonPath, exists: false, count: 0, tokenKeys: [], ok: false };
  }
  const parsed = JSON.parse(readFileSync(jsonPath, "utf8")) as Record<string, unknown>;
  const tokenKeys = Object.keys(parsed).filter((k) => k.startsWith("--"));
  return {
    path: jsonPath,
    exists: true,
    count: tokenKeys.length,
    tokenKeys,
    ok: tokenKeys.length >= minCount,
  };
}

function isMain(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return entry.endsWith("export-penpot-tokens.ts");
  }
}

if (isMain()) {
  const r = verifyPenpotTokens();
  if (!r.exists) {
    process.stderr.write(`token export missing: ${r.path}\n`);
    process.exit(1);
  }
  process.stdout.write(`${r.count} tokens in ${r.path} (min ${MIN_TOKEN_COUNT})\n`);
  process.exit(r.ok ? 0 : 1);
}
