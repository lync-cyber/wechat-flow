import { describe, expect, it } from "vitest";
import { buildDualMimePayload } from "../dual-mime-payload.ts";

describe("buildDualMimePayload (T-169 AC-001)", () => {
  it("returns exactly one ClipboardItem", () => {
    const items = buildDualMimePayload("<p>hi</p>", "hi");

    expect(items).toHaveLength(1);
  });

  it("that single ClipboardItem carries both text/html and text/plain representations", () => {
    const [item] = buildDualMimePayload("<p>hi</p>", "hi");

    expect(item.types).toContain("text/html");
    expect(item.types).toContain("text/plain");
    expect(item.types).toHaveLength(2);
  });

  it("the text/html representation content equals the html argument", async () => {
    const html = '<section style="color:#333"><h1>Hello</h1></section>';
    const [item] = buildDualMimePayload(html, "Hello");

    const blob = await item.getType("text/html");
    const text = await blob.text();
    expect(text).toBe(html);
  });

  it("the text/plain representation content equals the text argument", async () => {
    const [item] = buildDualMimePayload("<p>Hello</p>", "Hello world");

    const blob = await item.getType("text/plain");
    const text = await blob.text();
    expect(text).toBe("Hello world");
  });
});
