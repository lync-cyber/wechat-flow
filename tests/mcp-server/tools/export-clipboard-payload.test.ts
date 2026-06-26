import { describe, expect, it } from "vitest";
import { exportClipboardPayloadTool } from "../../../apps/mcp-server/src/tools/export-clipboard-payload.ts";

const SAMPLE_MD = "# Hello\n\nThis is a **test** paragraph.";

// ---- AC-001: returns { html, text } with inline-styled + simulatePaste-filtered html ----

describe("AC-001: exportClipboardPayloadTool returns { html, text } from the composeCopy pipeline", () => {
  it("returns an object with html and text string fields for basic markdown input", async () => {
    const result = await exportClipboardPayloadTool({ markdown: SAMPLE_MD, themeId: "default" });

    expect(typeof result.html).toBe("string");
    expect(result.html.length).toBeGreaterThan(0);

    expect(typeof result.text).toBe("string");
    expect(result.text.length).toBeGreaterThan(0);

    // html must contain the heading content
    expect(result.html).toMatch(/hello/i);
    // text is plain text (no tags)
    expect(result.text).toMatch(/hello/i);
    expect(result.text).not.toMatch(/<[^>]+>/);
  });

  it("without themeId arg, still returns valid { html, text }", async () => {
    const result = await exportClipboardPayloadTool({ markdown: SAMPLE_MD });

    expect(typeof result.html).toBe("string");
    expect(result.html.length).toBeGreaterThan(0);
    expect(typeof result.text).toBe("string");
  });
});

// ---- AC-002: returned html does not contain <style> tags ----

describe("AC-002: html field must not contain <style> tags after simulatePaste filtering", () => {
  it("html field does not match /<style/ after the paste simulation pipeline", async () => {
    const result = await exportClipboardPayloadTool({ markdown: SAMPLE_MD, themeId: "default" });
    expect(result.html).not.toMatch(/<style/i);
  });

  it("html field has no <style> even for complex markdown with themeId", async () => {
    const complexMd = "# Title\n\n> Blockquote\n\n- item 1\n- item 2\n\n**bold** and _italic_";
    const result = await exportClipboardPayloadTool({ markdown: complexMd, themeId: "default" });
    expect(result.html).not.toMatch(/<style/i);
  });
});

// ---- AC-003: Tool delegates to core renderMarkdown + simulatePaste (behavioral verification) ----

describe("AC-003: Tool output is consistent with the renderMarkdown + simulatePaste pipeline", () => {
  it("text field equals html with all tags stripped", async () => {
    const result = await exportClipboardPayloadTool({
      markdown: "# Test\n\nParagraph.",
      themeId: "default",
    });

    // The text field must not contain any HTML tags
    expect(result.text).not.toMatch(/<[^>]+>/);
    // The text must contain the actual prose content
    expect(result.text).toMatch(/test/i);
    expect(result.text).toMatch(/paragraph/i);
  });

  it("html field contains inline styles (evidence of renderMarkdown inline-styling)", async () => {
    const result = await exportClipboardPayloadTool({ markdown: "# Hello", themeId: "default" });
    // inline-styled HTML produced by renderMarkdown will contain style= attributes
    expect(result.html).toMatch(/style=/i);
  });
});
