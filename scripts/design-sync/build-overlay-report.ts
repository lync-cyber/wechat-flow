import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { COMPONENT_IDS, PAGE_IDS } from "./export-penpot-frames.ts";

export interface OverlaySection {
  id: string;
  name: string;
  penpotSrc: string;
  frontendSrc: string | null;
}

export interface OverlayBuildResult {
  html: string;
  componentsTotal: number;
  pagesTotal: number;
}

const REPORT_PATH = "docs/design/reports/overlay-report.html";
const FRONTEND_ROOT = "e2e/visual/design-overlay-output";

const COMPONENT_NAMES: Record<string, string> = {
  "UC-001": "TopBar",
  "UC-002": "ResizableSplitter",
  "UC-003": "ToolbarButton",
  "UC-004": "SourcePane",
  "UC-005": "PreviewPane",
  "UC-006": "LeftPanelTabs",
  "UC-007": "ThemeCard",
  "UC-008": "BlockLibItem",
  "UC-009": "CommandPalette",
  "UC-010": "DropdownMenu",
  "UC-011": "Toast",
  "UC-012": "Modal / Dialog",
  "UC-013": "DiagnosticsPanel",
  "UC-014": "JobProgressBar",
  "UC-015": "InsertDrawer",
  "UC-016": "ContextMenu",
  "UC-017": "ZhTypoReviseDialog",
  "UC-018": "ImageUploadOverlay",
  "UC-019": "PaintDrawer",
  "UC-020": "BaseColorDeriveModal",
  "UC-021": "DirectiveAutocompletePopover",
  "UC-022": "TemplateThemeCard",
  "UC-023": "StatusBar",
};

const PAGE_NAMES: Record<string, string> = {
  "P-001": "编辑器主页",
  "P-002": "文档列表",
  "P-003": "主题模板市场",
  "P-004": "设置页",
  "P-005": "移动端只读预览",
};

function figure(label: string, src: string | null): string {
  const body = src
    ? `<img loading="lazy" src="${src}" alt="${label}">`
    : `<div class="missing">未生成</div>`;
  return `<figure><figcaption>${label}</figcaption>${body}</figure>`;
}

function sectionHtml(s: OverlaySection): string {
  return [
    "<section>",
    `<h2>${s.id}: ${s.name}</h2>`,
    `<div class="pair">`,
    figure("Penpot 设计稿", s.penpotSrc),
    figure("前端渲染", s.frontendSrc),
    "</div>",
    "</section>",
  ].join("");
}

export function renderReportHtml(components: OverlaySection[], pages: OverlaySection[]): string {
  const style = [
    "body{font-family:system-ui,-apple-system,'PingFang SC',sans-serif;margin:0;background:#faf8f5;color:#1c1917}",
    "header{padding:24px 32px;border-bottom:1px solid #d9d4cb;background:#f4f1ec}",
    "h1{font-size:20px;margin:0 0 8px}.stats{font-size:14px;color:#4a4541}",
    "h2{font-size:15px;margin:24px 32px 8px}",
    "section{border-bottom:1px solid #e8e4dc}",
    ".pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:0 32px 24px}",
    "figure{margin:0}figcaption{font-size:11px;color:#7a746c;margin-bottom:6px}",
    "img{max-width:100%;border:1px solid #e8e4dc;border-radius:6px;background:#fff}",
    ".missing{padding:32px;text-align:center;color:#7a746c;border:1px dashed #d9d4cb;border-radius:6px}",
  ].join("");
  return [
    '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">',
    "<title>前端 vs Penpot 设计稿并排差异报告</title>",
    `<style>${style}</style></head><body>`,
    "<header><h1>前端 vs Penpot 设计稿并排差异报告</h1>",
    `<div class="stats">${components.length}/23 组件、${pages.length}/5 页面 已生成并排对照</div></header>`,
    "<main>",
    components.map(sectionHtml).join(""),
    pages.map(sectionHtml).join(""),
    "</main></body></html>",
  ].join("");
}

export function buildOverlayReport(opts?: { repoRoot?: string }): OverlayBuildResult {
  const repoRoot = opts?.repoRoot ?? process.cwd();
  const components: OverlaySection[] = [];
  for (const id of COMPONENT_IDS) {
    const penpotRel = `../frames/components/${id}.png`;
    if (!existsSync(join(repoRoot, "docs/design/frames/components", `${id}.png`))) continue;
    const feRel = `../../../${FRONTEND_ROOT}/components/${id}.png`;
    const feExists = existsSync(join(repoRoot, FRONTEND_ROOT, "components", `${id}.png`));
    components.push({
      id,
      name: COMPONENT_NAMES[id] ?? id,
      penpotSrc: penpotRel,
      frontendSrc: feExists ? feRel : null,
    });
  }
  const pages: OverlaySection[] = [];
  for (const id of PAGE_IDS) {
    if (!existsSync(join(repoRoot, "docs/design/frames/pages", `${id}-desktop.png`))) continue;
    const feRel = `../../../${FRONTEND_ROOT}/pages/${id}.png`;
    const feExists = existsSync(join(repoRoot, FRONTEND_ROOT, "pages", `${id}.png`));
    pages.push({
      id,
      name: PAGE_NAMES[id] ?? id,
      penpotSrc: `../frames/pages/${id}-desktop.png`,
      frontendSrc: feExists ? feRel : null,
    });
  }
  return {
    html: renderReportHtml(components, pages),
    componentsTotal: components.length,
    pagesTotal: pages.length,
  };
}

function isMain(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return entry.endsWith("build-overlay-report.ts");
  }
}

if (isMain()) {
  const result = buildOverlayReport();
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, result.html, "utf8");
  process.stdout.write(
    `overlay report → ${REPORT_PATH} (${result.componentsTotal}/23 组件, ${result.pagesTotal}/5 页面)\n`
  );
}
