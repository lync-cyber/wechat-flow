import { existsSync, readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Penpot frame PNG 像素经交互式 Penpot MCP 导出管线产出（POSIX 容器 fs 与宿主隔离，
// 脚本进程无法直写宿主帧文件）；本脚本 gate 校验冻结导出集是否完整并列出缺失清单。

export type FrameScope = "components" | "pages";

export interface FrameCheckResult {
  scope: FrameScope;
  dir: string;
  expected: string[];
  present: string[];
  missing: string[];
}

const FRAMES_ROOT = "docs/design/frames";

export const COMPONENT_IDS: string[] = Array.from(
  { length: 23 },
  (_, i) => `UC-${String(i + 1).padStart(3, "0")}`
);

export const PAGE_IDS: string[] = Array.from(
  { length: 5 },
  (_, i) => `P-${String(i + 1).padStart(3, "0")}`
);

export function expectedFrameFiles(scope: FrameScope): string[] {
  return scope === "components"
    ? COMPONENT_IDS.map((id) => `${id}.png`)
    : PAGE_IDS.map((id) => `${id}-desktop.png`);
}

export function checkFrames(scope: FrameScope, framesRoot: string = FRAMES_ROOT): FrameCheckResult {
  const dir = join(framesRoot, scope);
  const expected = expectedFrameFiles(scope);
  const onDisk = existsSync(dir) ? new Set(readdirSync(dir)) : new Set<string>();
  const present = expected.filter((f) => onDisk.has(f));
  const missing = expected.filter((f) => !onDisk.has(f));
  return { scope, dir, expected, present, missing };
}

function runScope(scope: FrameScope, framesRoot: string): FrameCheckResult {
  const r = checkFrames(scope, framesRoot);
  process.stdout.write(`[${scope}] ${r.present.length}/${r.expected.length} present in ${r.dir}\n`);
  if (r.missing.length > 0) {
    process.stderr.write(`[${scope}] MISSING ${r.missing.length}: ${r.missing.join(", ")}\n`);
  }
  return r;
}

function isMain(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return entry.endsWith("export-penpot-frames.ts");
  }
}

if (isMain()) {
  const scopeArg = process.argv.find((a) => a.startsWith("--scope="))?.split("=")[1];
  const scopes: FrameScope[] =
    scopeArg === "components" || scopeArg === "pages" ? [scopeArg] : ["components", "pages"];
  const results = scopes.map((s) => runScope(s, FRAMES_ROOT));
  const totalMissing = results.reduce((n, r) => n + r.missing.length, 0);
  process.exit(totalMissing === 0 ? 0 : 1);
}
