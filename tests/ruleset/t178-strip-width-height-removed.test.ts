import type { Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";
import { describe, expect, it } from "vitest";
import { applyRuleset, builtinRules } from "../../packages/ruleset/src/index.ts";

// T-178 AC-001: strip-width-height-inline removed — width/height declarations that occur in
// real production authoring surfaces (table-cell layout in gallery/compare/dropcap, fixed-px
// authored images) must survive a full authoring-stage ruleset pass. Assertions bind to the
// serialized style output of applyRuleset(hast, builtinRules, "authoring") — the exact call
// packages/core/src/render.ts makes — not to source-level rule presence.

function runAuthoringStage(html: string): string {
  const hast = fromHtml(html, { fragment: true }) as unknown as Root;
  const result = applyRuleset(hast, builtinRules, "authoring");
  return toHtml(result.hast).trim();
}

describe("T-178 AC-001: table-cell width declarations survive the authoring-stage ruleset", () => {
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
