import { expect, test } from "@playwright/test";

// 真实浏览器验证 PreviewPane iframe sandbox + CSP 阻断脚本执行。
// happy-dom 单测（apps/editor/src/components/editor/__tests__/PreviewPane.test.ts）
// 不实现真实 iframe sandbox 语义，仅能验证脚本原文进入 srcdoc；script 是否真被浏览器
// 阻断执行必须由真实 Chromium 验证，此为该缺口的真实用户输入路径实测。
test.describe("PreviewPane iframe 沙箱 XSS 防护（真实浏览器）", () => {
  test("键入含 <script> 的 Markdown 后，预览 iframe 不执行注入脚本", async ({ page }) => {
    let dialogFired = false;
    page.on("dialog", async (dialog) => {
      dialogFired = true;
      await dialog.dismiss();
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

    const sourceEditor = page.locator('[data-testid="source-pane-editor"] .cm-content');
    await expect(sourceEditor).toBeVisible({ timeout: 10000 });

    // 真实键入原语：清空编辑器已有内容后逐字符输入携带 raw HTML <script> 的 Markdown。
    await sourceEditor.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await page.keyboard.type(
      '# XSS probe\n\n<script>window.__wf_xss_marker__ = "pwned"; alert("xss");</script>\n\nSafe paragraph.',
      { delay: 5 }
    );

    // 等待防抖渲染管线把 markdown 编译进 iframe srcdoc。
    const previewIframe = page.frameLocator('[data-testid="preview-iframe"]');
    await expect(previewIframe.locator("body")).toContainText("Safe paragraph", {
      timeout: 10000,
    });

    // 断言 1：script 标签原文可能进入 srcdoc（渲染管线未必剥离），但绝不能在 iframe
    // window 上下文实际执行 —— sandbox="allow-same-origin"（无 allow-scripts）+ CSP
    // default-src 'none' 双重阻断。
    const iframeElementHandle = await page
      .locator('[data-testid="preview-iframe"]')
      .elementHandle();
    const frame = await iframeElementHandle?.contentFrame();
    expect(frame).not.toBeNull();

    const markerInIframe = await frame?.evaluate(
      () => (window as unknown as Record<string, unknown>).__wf_xss_marker__
    );
    expect(markerInIframe).toBeUndefined();

    // 断言 2：脚本执行会触发 alert() dialog；真实浏览器沙箱应从未触发。
    expect(dialogFired).toBe(false);

    // 断言 3：父页面 window 同样未被污染（sandbox 未逃逸到 top-level context）。
    const markerInParent = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__wf_xss_marker__
    );
    expect(markerInParent).toBeUndefined();
  });

  test("iframe sandbox 属性在真实 DOM 中不含 allow-scripts", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const sandboxAttr = await page
      .locator('[data-testid="preview-iframe"]')
      .getAttribute("sandbox");
    expect(sandboxAttr ?? "").toContain("allow-same-origin");
    expect(sandboxAttr ?? "").not.toContain("allow-scripts");
  });
});
