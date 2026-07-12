import type { Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";
import { beforeEach, describe, expect, it } from "vitest";
import {
  registerTheme,
  renderMarkdown,
  resetBlockRegistry,
  resetThemeRegistry,
  resetVariantRegistry,
} from "../../packages/core/src/index.ts";
import { applyRuleset, builtinRules } from "../../packages/ruleset/src/index.ts";
import "../../packages/blocks/src/index.ts";
import defaultTheme from "../../packages/themes/default/src/index.ts";

// T-178 AC-001: strip-width-height-inline removed. Two distinct guarantees:
//
// 1. Authoring-stage pass (first two describes): only the img fixed-size case reaches the
//    authoring-stage ruleset with a style attribute in the real pipeline (author-supplied
//    inline style exists before the ruleset runs). The gallery/compare/dropcap table-cell
//    fragments below do NOT occur at that stage in production — their width declarations are
//    injected later by inlineStyle(), after applyRuleset(hast, rules, "authoring")
//    (packages/core/src/render.ts). Those cases are structural regression locks: they fail if
//    a width/height-stripping rule is ever reintroduced into the authoring stage OR such a
//    rule is moved to run after style injection — not re-enactments of production input.
//
// 2. Full-pipeline survival (renderMarkdown describe): the load-bearing table-cell widths of
//    gallery/compare/dropcap must reach the final render().html through the complete pipeline
//    (decorate → authoring ruleset → inlineStyle → customCss → output patch).

function runAuthoringStage(html: string): string {
  const hast = fromHtml(html, { fragment: true }) as unknown as Root;
  const result = applyRuleset(hast, builtinRules, "authoring");
  return toHtml(result.hast).trim();
}

describe("T-178 AC-001: table-cell width declarations survive the authoring-stage ruleset (structural lock; production injects these widths after this stage)", () => {
  it("gallery duo cell (display:table-cell; width:50%; padding:4px) keeps width:50% after authoring pass", () => {
    const out = runAuthoringStage(
      '<section data-block-slot="cell" style="display:table-cell; width:50%; padding:4px">img</section>'
    );
    expect(out).toMatch(/width:\s*50%/);
    expect(out).toMatch(/display:\s*table-cell/);
  });

  it("gallery triptych cell (width:33.33%) keeps width:33.33% after authoring pass", () => {
    const out = runAuthoringStage(
      '<section data-block-slot="cell" style="display:table-cell; width:33.33%; padding:3px">img</section>'
    );
    expect(out).toMatch(/width:\s*33\.33%/);
  });

  it("compare ledger cell (width:50%; padding:16px) keeps width:50% after authoring pass", () => {
    const out = runAuthoringStage(
      '<section data-block-slot="left" style="display:table-cell; width:50%; padding:16px; background:var(--color-surface-alt)">left</section>'
    );
    expect(out).toMatch(/width:\s*50%/);
  });

  it("dropcap table-cell (width:1%) keeps width:1% after authoring pass", () => {
    const out = runAuthoringStage(
      '<section data-block-slot="dropcap" style="display:table-cell; width:1%; white-space:nowrap; vertical-align:top; padding-right:8px; font-size:2.2em; font-weight:700; line-height:1; color:var(--color-brand)">F</section>'
    );
    expect(out).toMatch(/width:\s*1%/);
  });
});

describe("T-178 AC-001: img fixed width/height declarations survive the authoring-stage ruleset", () => {
  it("author-fixed image size (width:200px; height:150px) both survive the authoring pass", () => {
    const out = runAuthoringStage('<img src="a.png" style="width:200px;height:150px" alt="a">');
    expect(out).toMatch(/width:\s*200px/);
    expect(out).toMatch(/height:\s*150px/);
  });
});

describe("T-178 AC-001: clamp-image-max-width auto-adaptive constraint is unaffected by removal", () => {
  it("img style max-width:150% is still clamped to 100% by the output-stage ruleset", () => {
    const hast = fromHtml('<img src="a.png" style="max-width:150%">', {
      fragment: true,
    }) as unknown as Root;
    const result = applyRuleset(hast, builtinRules, "output");
    const out = toHtml(result.hast).trim();
    expect(out).toMatch(/max-width:\s*100%/);
    expect(out).not.toMatch(/max-width:\s*150%/);
  });
});

describe("T-178 AC-001: strip-width-height-inline no longer registered", () => {
  it("builtinRules contains no rule with id strip-width-height-inline", () => {
    expect(builtinRules.some((r) => r.id === "strip-width-height-inline")).toBe(false);
  });
});

describe("T-178 AC-001: table-cell widths survive the complete renderMarkdown() pipeline", () => {
  beforeEach(() => {
    resetVariantRegistry();
    resetBlockRegistry();
    resetThemeRegistry();
    registerTheme(defaultTheme);
  });

  it("gallery duo cells keep width: 50% in final html", async () => {
    const md = [
      ":::gallery{.duo}",
      "- ![图一](https://example.com/a.png)",
      "- ![图二](https://example.com/b.png)",
      ":::",
    ].join("\n");
    const result = await renderMarkdown(md, { themeId: "default" });
    const cells = [...result.html.matchAll(/<section style="([^"]*display: table-cell[^"]*)">/g)];
    expect(cells.length).toBe(2);
    for (const cell of cells) {
      expect(cell[1]).toContain("width: 50%");
    }
  });

  it("compare ledger columns keep width: 50% in final html", async () => {
    const md =
      ':::compare{.ledger left-label="优点" left-value="速度快" right-label="缺点" right-value="成本高" title="方案对比"}\n:::';
    const result = await renderMarkdown(md, { themeId: "default" });
    const cells = [...result.html.matchAll(/<section style="([^"]*display: table-cell[^"]*)">/g)];
    expect(cells.length).toBeGreaterThanOrEqual(2);
    for (const cell of cells) {
      expect(cell[1]).toContain("width: 50%");
    }
  });

  it("paragraph dropcap cell keeps width: 1% in final html", async () => {
    const result = await renderMarkdown(":::paragraph{.dropcap}\n首字后面的正文\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<section style="([^"]*)">首<\/section>/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toContain("display: table-cell");
    expect(match?.[1]).toContain("width: 1%");
  });
});
