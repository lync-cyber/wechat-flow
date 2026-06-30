import { beforeEach, describe, expect, it } from "vitest";
import {
  contextAwareRender,
  renderMarkdown,
  resetBlockRegistry,
  resetThemeRegistry,
  withinBlock,
} from "../../packages/core/src/index.ts";
import { registerTheme } from "../../packages/core/src/registry/theme.ts";
import "../../packages/blocks/src/index.ts";
import type { Element, Root as HastRoot } from "hast";

const MINIMAL_BLOCKS = {
  h1: { default: { "font-size": "22px" } },
  h2: { default: { "font-size": "18px" } },
  p: { default: { "font-size": "15px" } },
};

function makeDecoratedTheme(id: string, assets: Record<string, string>) {
  return {
    id,
    name: "Test Decorated",
    tokens: { "--color-brand": "#2D5A4E" },
    blocks: MINIMAL_BLOCKS,
    assets,
  };
}

beforeEach(() => {
  resetThemeRegistry();
  resetBlockRegistry();
});

describe("withinBlock: direct unit tests", () => {
  it("returns true when an ancestor has data-block matching blockId", () => {
    const ancestor: Element = {
      type: "element",
      tagName: "div",
      properties: { "data-block": "callout" },
      children: [],
    };
    expect(withinBlock([ancestor], "callout")).toBe(true);
  });

  it("returns false when no ancestor has the matching data-block", () => {
    const ancestor: Element = {
      type: "element",
      tagName: "div",
      properties: { "data-block": "card" },
      children: [],
    };
    expect(withinBlock([ancestor], "callout")).toBe(false);
  });

  it("returns false for empty ancestors array", () => {
    expect(withinBlock([], "callout")).toBe(false);
  });

  it("returns true when match is among multiple ancestors", () => {
    const ancestors: Element[] = [
      { type: "element", tagName: "div", properties: { "data-block": "card" }, children: [] },
      { type: "element", tagName: "div", properties: { "data-block": "callout" }, children: [] },
    ];
    expect(withinBlock(ancestors, "callout")).toBe(true);
  });
});

describe("contextAwareRender: no-op when assets empty", () => {
  it("returns same hast reference when theme has no assets", () => {
    const hast: HastRoot = { type: "root", children: [] };
    const theme = makeDecoratedTheme("empty-t", {});
    const result = contextAwareRender(hast, theme);
    expect(result).toBe(hast);
  });

  it("returns same hast reference when theme is undefined", () => {
    const hast: HastRoot = { type: "root", children: [] };
    const result = contextAwareRender(hast, undefined);
    expect(result).toBe(hast);
  });
});

describe("AC-002: context-aware render — callout inner h2 gets in-callout class", () => {
  it("h2 inside callout container gets class=in-callout", async () => {
    registerTheme(
      makeDecoratedTheme("ctx-test", {
        "heading.h2": '<svg width="4" height="4"><rect fill="#2D5A4E"/></svg>',
      })
    );
    const md = ":::callout\n## 内层标题\n:::\n\n## 外层标题";
    const result = await renderMarkdown(md, { themeId: "ctx-test" });
    expect(result.html).toContain("in-callout");
    expect(result.html).toContain("standalone");
  });

  it("top-level h2 gets class=standalone", async () => {
    registerTheme(
      makeDecoratedTheme("ctx-test2", {
        "heading.h2": '<svg width="4" height="4"><rect fill="#2D5A4E"/></svg>',
      })
    );
    const md = "## 外层标题";
    const result = await renderMarkdown(md, { themeId: "ctx-test2" });
    expect(result.html).toContain("standalone");
    expect(result.html).not.toContain("in-callout");
  });

  it("h2 inside callout does NOT get standalone, top-level h2 does NOT get in-callout", async () => {
    registerTheme(
      makeDecoratedTheme("ctx-test3", {
        "heading.h2": '<svg width="4" height="4"><rect fill="#2D5A4E"/></svg>',
      })
    );
    const md = ":::callout\n## 内层标题\n:::\n\n## 外层标题";
    const result = await renderMarkdown(md, { themeId: "ctx-test3" });

    const html = result.html;
    const calloutMatch = html.match(/data-block="callout"[^>]*>([\s\S]*?)<\/div>/);
    const calloutInner = calloutMatch?.[0] ?? "";
    expect(calloutInner).toContain("in-callout");
    expect(calloutInner).not.toContain("standalone");
  });
});

describe("determinism: empty assets => h2 has no in-callout/standalone class", () => {
  it("h2 with empty assets theme has no context class", async () => {
    registerTheme(makeDecoratedTheme("no-deco", {}));
    const result = await renderMarkdown("## 标题", { themeId: "no-deco" });
    expect(result.html).not.toContain("in-callout");
    expect(result.html).not.toContain("standalone");
    expect(result.html).not.toContain("class=");
  });

  it("h2 with no theme has no context class", async () => {
    const result = await renderMarkdown("## 标题");
    expect(result.html).not.toContain("in-callout");
    expect(result.html).not.toContain("standalone");
    expect(result.html).not.toContain("class=");
  });

  it("default theme (assets:{}) h2 has no context class", async () => {
    const result = await renderMarkdown("## 标题", { themeId: "default" });
    expect(result.html).not.toContain("in-callout");
    expect(result.html).not.toContain("standalone");
    expect(result.html).not.toContain("class=");
  });
});
