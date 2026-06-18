import { beforeEach, describe, expect, it } from "vitest";
import {
  renderMarkdown,
  resetBlockRegistry,
  resetVariantRegistry,
} from "../../../packages/core/src/index.ts";
import "../../../packages/blocks/src/index.ts";

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
});

// AC-T120-003: customCss h1 { color: red } → <h1> style 含 color: red（juice cascade 生效）
describe("AC-T120-003: customCss h1 { color: red } → <h1> style 含 color: red", () => {
  it("customCss 经 juice cascade 内联到 <h1> style", async () => {
    const result = await renderMarkdown("# Hello", {
      themeId: "default",
      customCss: "h1 { color: red; }",
    });
    // h1 element must carry the custom-css declaration inlined via juice cascade
    expect(result.html).toMatch(/<h1[^>]*style="[^"]*color:\s*red/);
  });
});

// AC-T120-004: customCss 白名单外属性被拒，diagnostics 含 source:custom-css
describe("AC-T120-004: customCss 白名单外属性被拒 + diagnostics source:custom-css", () => {
  it("position: fixed 不进入产物，且 result.diagnostics 含 source:'custom-css' 条目", async () => {
    const result = await renderMarkdown("# Hello", {
      themeId: "default",
      customCss: "h1 { position: fixed; }",
    });
    // position must not survive into the <h1> output (rejected by whitelist)
    expect(result.html).not.toMatch(/position:\s*fixed/);
    // a custom-css diagnostic must report the rejected declaration
    const customCssDiag = result.diagnostics.find((d) => d.source === "custom-css");
    expect(customCssDiag).toBeDefined();
  });
});

// AC-T120-005: customCss undefined/'' → 跳过 juice pass（输出不变 + 无 custom-css diagnostic）
describe("AC-T120-005: customCss undefined/'' → 跳过整个 juice pass", () => {
  it("空 customCss 输出与不传 customCss 完全一致，且无 custom-css diagnostic", async () => {
    const withEmpty = await renderMarkdown("# Hello", { themeId: "default", customCss: "" });
    const without = await renderMarkdown("# Hello", { themeId: "default" });
    expect(withEmpty.html).toBe(without.html);
    expect(withEmpty.diagnostics.find((d) => d.source === "custom-css")).toBeUndefined();
  });
});
