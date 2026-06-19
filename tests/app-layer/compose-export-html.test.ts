import { describe, expect, it } from "vitest";
import { composeExportHtml } from "../../apps/editor/src/use-cases/export-html.ts";

describe("AC-001: composeExportHtml returns standalone HTML document structure", () => {
  it("returns a string containing <!DOCTYPE html>", async () => {
    const result = await composeExportHtml({ markdown: "# Hello", themeId: "default" });
    expect(result).toContain("<!DOCTYPE html>");
  });

  it("returns a string containing <html> tag", async () => {
    const result = await composeExportHtml({ markdown: "# Hello", themeId: "default" });
    expect(result).toMatch(/<html[\s>]/);
  });

  it("returns a string containing <body> tag", async () => {
    const result = await composeExportHtml({ markdown: "# Hello", themeId: "default" });
    expect(result).toMatch(/<body[\s>]/);
  });

  it("body contains inline-styled content from rendered markdown", async () => {
    const result = await composeExportHtml({ markdown: "# Hello", themeId: "default" });
    // The body should contain rendered HTML content (inline-styled heading)
    expect(result).toMatch(/<body[\s\S]*style=/);
  });
});

describe("AC-002: exported HTML is self-contained (no external CSS dependencies)", () => {
  it("head contains a CSS reset or base styles", async () => {
    const result = await composeExportHtml({ markdown: "# Hello", themeId: "default" });
    // head should contain either a <style> tag with reset CSS or font CDN links
    expect(result).toMatch(/<head[\s\S]*<style[\s\S]*<\/head>/);
  });

  it("head contains font CDN link or fallback font declaration", async () => {
    const result = await composeExportHtml({ markdown: "# Hello", themeId: "default" });
    // head should contain font reference (CDN link or inline font-family)
    expect(result).toMatch(/<head[\s\S]*font[\s\S]*<\/head>/i);
  });

  it("body content does not reference external CSS files (no <link rel=stylesheet> in body)", async () => {
    const result = await composeExportHtml({ markdown: "# Hello", themeId: "default" });
    const bodyMatch = result.match(/<body[^>]*>([\s\S]*)<\/body>/);
    expect(bodyMatch).not.toBeNull();
    const bodyContent = bodyMatch?.[1];
    expect(bodyContent).not.toMatch(/<link[^>]*rel=["']?stylesheet/i);
  });

  it("body content does not use CSS custom properties (no var(--)", async () => {
    const result = await composeExportHtml({ markdown: "# Hello", themeId: "default" });
    const bodyMatch = result.match(/<body[^>]*>([\s\S]*)<\/body>/);
    expect(bodyMatch).not.toBeNull();
    const bodyContent = bodyMatch?.[1];
    expect(bodyContent).not.toContain("var(--");
  });

  it("body content does not contain <style> tags (styles are inline, not embedded)", async () => {
    const result = await composeExportHtml({ markdown: "# Hello", themeId: "default" });
    const bodyMatch = result.match(/<body[^>]*>([\s\S]*)<\/body>/);
    expect(bodyMatch).not.toBeNull();
    const bodyContent = bodyMatch?.[1];
    expect(bodyContent).not.toMatch(/<style[\s>]/i);
  });
});
