import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../../packages/core/src/index.ts";

// customCss 白名单放行 display，FORBIDDEN_DISPLAY_VALUES 须由 output 相 patch
// 降级为微信粘贴后的实际回退值，保证预览 ≡ 粘贴后视觉。

describe("customCss 注入 FORBIDDEN display 值经 output 相降级", () => {
  it("display:grid 不出现在最终产物，降级为 block", async () => {
    const result = await renderMarkdown("hello world", {
      customCss: "p { display: grid; color: red }",
    });

    expect(result.html).not.toMatch(/display\s*:\s*grid/);
    expect(result.html).toMatch(/display\s*:\s*block/);
    expect(result.html).toMatch(/color\s*:\s*red/);
  });

  it("display:inline-grid 不出现在最终产物，降级为 inline-block", async () => {
    const result = await renderMarkdown("hello **bold** world", {
      customCss: "strong { display: inline-grid }",
    });

    expect(result.html).not.toMatch(/display\s*:\s*inline-grid/);
    expect(result.html).toMatch(/display\s*:\s*inline-block/);
  });

  it("display:flex 不出现在最终产物，降级为 block（既有 patch-flex-to-block 行为锚定）", async () => {
    const result = await renderMarkdown("hello world", {
      customCss: "p { display: flex }",
    });

    expect(result.html).not.toMatch(/display\s*:\s*flex/);
    expect(result.html).toMatch(/display\s*:\s*block/);
  });
});
