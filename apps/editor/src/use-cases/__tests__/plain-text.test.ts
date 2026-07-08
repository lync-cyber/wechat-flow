import { describe, expect, it } from "vitest";
import { extractPlainText } from "../plain-text.ts";

describe("extractPlainText (T-169 AC-003)", () => {
  it("strips all HTML tags from nested elements", () => {
    const html =
      '<section style="color:#333"><h1>Hello</h1><p>World <strong>bold</strong></p></section>';

    const text = extractPlainText(html);

    expect(text).not.toMatch(/<[^>]+>/);
  });

  it("decodes HTML entities such as &#x27; into their literal characters", () => {
    const html = "<p>It&#x27;s a test &amp; more</p>";

    const text = extractPlainText(html);

    expect(text).toContain("It's a test & more");
    expect(text).not.toMatch(/&#x27;|&amp;/);
  });

  it("inserts line breaks at block-level element boundaries", () => {
    const html = "<h1>Title</h1><p>First paragraph.</p><p>Second paragraph.</p>";

    const text = extractPlainText(html);
    const lines = text.split("\n");

    expect(lines).toContain("Title");
    expect(lines).toContain("First paragraph.");
    expect(lines).toContain("Second paragraph.");
  });

  it("does not insert line breaks between inline elements within the same block", () => {
    const html = "<p>Some <strong>bold</strong> and <em>italic</em> text.</p>";

    const text = extractPlainText(html);

    expect(text).toBe("Some bold and italic text.");
  });

  it("handles a realistic multi-block rendered fragment with no leftover tags or entities", () => {
    const html =
      '<section style="color:#333"><h1 style="font-size:24px">It&#x27;s Alive</h1>' +
      "<p>A paragraph with <strong>emphasis</strong>.</p>" +
      "<blockquote><p>A quoted line.</p></blockquote></section>";

    const text = extractPlainText(html);

    expect(text).not.toMatch(/<[^>]+>/);
    expect(text).not.toMatch(/&#x27;|&amp;|&lt;|&gt;/);
    expect(text).toContain("It's Alive");
    expect(text).toContain("A paragraph with emphasis.");
    expect(text).toContain("A quoted line.");
  });
});
