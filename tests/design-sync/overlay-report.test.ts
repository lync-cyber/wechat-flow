import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildOverlayReport,
  renderReportHtml,
} from "../../scripts/design-sync/build-overlay-report";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

describe("renderReportHtml", () => {
  it("renders id:name sections, the stats line, and image srcs", () => {
    const html = renderReportHtml(
      [
        {
          id: "UC-001",
          name: "TopBar",
          penpotSrc: "../frames/components/UC-001.png",
          frontendSrc: "../../../e2e/visual/design-overlay-output/components/UC-001.png",
        },
        {
          id: "UC-002",
          name: "ResizableSplitter",
          penpotSrc: "../frames/components/UC-002.png",
          frontendSrc: null,
        },
      ],
      [
        {
          id: "P-001",
          name: "编辑器主页",
          penpotSrc: "../frames/pages/P-001-desktop.png",
          frontendSrc: null,
        },
      ]
    );
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("UC-001: TopBar");
    expect(html).toContain("2/23 组件、1/5 页面");
    expect(html).toContain('src="../frames/components/UC-001.png"');
    expect(html).toContain('src="../../../e2e/visual/design-overlay-output/components/UC-001.png"');
    expect(html).toContain("未生成");
  });
});

describe("buildOverlayReport — against frozen frames", () => {
  it("covers all 23 components and 5 pages from the committed frame set", () => {
    const r = buildOverlayReport({ repoRoot });
    expect(r.componentsTotal).toBe(23);
    expect(r.pagesTotal).toBe(5);
    expect(r.html).toContain("UC-023: StatusBar");
    expect(r.html).toContain("P-005: 移动端只读预览");
  });
});
