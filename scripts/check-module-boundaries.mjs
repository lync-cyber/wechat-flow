// 模块边界守卫 — 强制跨包导入走包级 barrel（对外公共 API 边界）。
//
// 拦截两类违规：
//   (a) 别名深引用：import ... from "@wechat-flow/<pkg>/src/..." 或 ".../dist/..."
//   (b) 相对路径逃逸：用 ../.. 直接引用另一个工作区包的内部文件
// 跨包导入必须改用包级 barrel（如 import { x } from "@wechat-flow/core"）。
//
// 覆盖 .ts/.tsx/.mts/.cts 与 .vue —— dependency-cruiser 不解析 .vue，本脚本补齐该盲区。
//
// 用法：
//   node scripts/check-module-boundaries.mjs [file ...]
//     传入文件列表 → 仅检查这些文件（pre-commit 增量，lefthook 注入 {staged_files}）
//     不传参       → 全量扫描 apps/ 与 packages/（CI）

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["apps", "packages"];
const SOURCE_EXT = /\.(ts|tsx|mts|cts|vue)$/;
const IGNORE = /(^|[\\/])(node_modules|dist|coverage|\.turbo|\.stryker-tmp)([\\/]|$)/;

// 匹配 `import ... from "X"` / `export ... from "X"` / `import("X")`
const SPECIFIER_RE = /(?:\bfrom|\bimport)\s*\(?\s*["']([^"']+)["']/g;
const DEEP_ALIAS_RE = /^@wechat-flow\/[^/]+\/(?:src|dist)\//;

function toPosix(p) {
  return p.split(sep).join("/");
}

function listSourceFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (IGNORE.test(full)) continue;
    if (entry.isDirectory()) out.push(...listSourceFiles(full));
    else if (SOURCE_EXT.test(entry.name)) out.push(full);
  }
  return out;
}

// 文件所属的工作区包根（packages/themes/x | packages/x | apps/x），否则 null
function packageRootOf(absFile) {
  const rel = toPosix(relative(ROOT, absFile));
  const m =
    rel.match(/^(packages\/themes\/[^/]+)\//) ||
    rel.match(/^(packages\/[^/]+)\//) ||
    rel.match(/^(apps\/[^/]+)\//);
  return m ? m[1] : null;
}

function findViolations(absFile) {
  let text;
  try {
    text = readFileSync(absFile, "utf8");
  } catch {
    return [];
  }
  const selfRoot = packageRootOf(absFile);
  const hits = [];
  for (const match of text.matchAll(SPECIFIER_RE)) {
    const spec = match[1];
    if (DEEP_ALIAS_RE.test(spec)) {
      hits.push({ spec, kind: "alias-deep-import" });
      continue;
    }
    if (spec.startsWith(".") && selfRoot) {
      const targetRoot = packageRootOf(resolve(dirname(absFile), spec));
      if (targetRoot && targetRoot !== selfRoot) {
        hits.push({ spec, kind: "relative-cross-package" });
      }
    }
  }
  return hits;
}

function resolveTargets(argv) {
  if (argv.length > 0) {
    return argv.map((a) => resolve(ROOT, a)).filter((p) => SOURCE_EXT.test(p) && !IGNORE.test(p));
  }
  return SCAN_DIRS.flatMap((d) => listSourceFiles(join(ROOT, d)));
}

const targets = resolveTargets(process.argv.slice(2));
let total = 0;
const lines = [];
for (const file of targets) {
  const hits = findViolations(file);
  if (hits.length === 0) continue;
  lines.push(`  ${toPosix(relative(ROOT, file))}`);
  for (const h of hits) {
    lines.push(`    ↳ "${h.spec}"  [${h.kind}]`);
    total += 1;
  }
}

if (total > 0) {
  console.error("\n✖ 模块边界违规：跨包深引用 / 相对逃逸（对外公共 API 边界）\n");
  console.error(lines.join("\n"));
  console.error("\n修复指引：");
  console.error(
    '  • 跨包导入必须走包级 barrel，例如：import { listThemes } from "@wechat-flow/core"'
  );
  console.error(
    "  • 若 barrel 未导出该符号，请到对应包的 src/index.ts 补 re-export，而不是深挖 /src/。"
  );
  console.error(
    "  • 同级包之间禁用相对路径（../../<pkg>/src），一律改用 @wechat-flow/<pkg> 别名。"
  );
  console.error(`\n共 ${total} 处违规，已拦截。\n`);
  process.exit(1);
}

console.log(`✔ 模块边界守卫通过（检查 ${targets.length} 个文件，0 违规）`);
