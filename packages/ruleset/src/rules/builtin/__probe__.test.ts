import { describe, it } from "vitest";
import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";

describe("probe property normalization", () => {
  it("prints hast properties", () => {
    const samples = [
      `<span aria-hidden="true" aria-label="x" role="presentation">Icon</span>`,
      `<div data-foo="bar" data-block="hero" data-tracking="x" data-foo-bar="z" data-variant="a" data-slot="s">Box</div>`,
      `<div id="main" class="container" onclick="x()">Hi</div>`,
    ];
    for (const s of samples) {
      const hast = fromHtml(s, { fragment: true }) as any;
      const el = hast.children[0];
      // eslint-disable-next-line no-console
      console.log("INPUT:", s);
      // eslint-disable-next-line no-console
      console.log("PROPS:", JSON.stringify(el.properties));
      // eslint-disable-next-line no-console
      console.log("ROUNDTRIP:", toHtml(hast));
      // eslint-disable-next-line no-console
      console.log("---");
    }
  });
});
