import { expect, test } from "@playwright/test";

// happy-dom 单测无法复现真实 Chromium 对 navigator.clipboard.write() 多 ClipboardItem
// 参数的拒绝语义（NotAllowedError），也无法读回系统剪贴板真实内容，此为该缺口的
// 真实用户输入路径实测：点击「复制到公众号」后读系统剪贴板验证 dual-MIME 写入成功。
test.describe("复制到公众号：真实系统剪贴板 dual-MIME 写入（真实浏览器）", () => {
  test("点击复制按钮后，系统剪贴板同时含样式化 text/html 与可读 text/plain", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

    const sourceEditor = page.locator('[data-testid="source-pane-editor"] .cm-content');
    await expect(sourceEditor).toBeVisible({ timeout: 10000 });

    await sourceEditor.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await page.keyboard.type(
      "# Clipboard Probe\n\nA paragraph with **bold** text.\n\n:::callout\nImportant callout content.\n:::\n",
      { delay: 5 }
    );

    const previewIframe = page.frameLocator('[data-testid="preview-iframe"]');
    await expect(previewIframe.locator("body")).toContainText("Clipboard Probe", {
      timeout: 10000,
    });

    await page.getByText("复制到公众号").click();

    await expect
      .poll(
        async () =>
          page.evaluate(async () => {
            const items = await navigator.clipboard.read();
            return items.length;
          }),
        { timeout: 10000 }
      )
      .toBeGreaterThan(0);

    const clipboardPayload = await page.evaluate(async () => {
      const items = await navigator.clipboard.read();
      const [item] = items;
      const result: { types: string[]; html: string; text: string } = {
        types: item.types,
        html: "",
        text: "",
      };
      if (item.types.includes("text/html")) {
        result.html = await (await item.getType("text/html")).text();
      }
      if (item.types.includes("text/plain")) {
        result.text = await (await item.getType("text/plain")).text();
      }
      return result;
    });

    expect(clipboardPayload.types).toContain("text/html");
    expect(clipboardPayload.types).toContain("text/plain");

    expect(clipboardPayload.html.length).toBeGreaterThan(0);
    expect(clipboardPayload.html).toMatch(/data-block/);
    expect(clipboardPayload.html).toMatch(/style=/);

    expect(clipboardPayload.text.length).toBeGreaterThan(0);
    expect(clipboardPayload.text).not.toMatch(/<[^>]+>/);
    expect(clipboardPayload.text).toMatch(/Clipboard Probe/);
  });
});
