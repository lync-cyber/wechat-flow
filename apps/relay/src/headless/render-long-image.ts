import type { PlaywrightPool } from "./playwright-pool.ts";

export interface RenderLongImageOpts {
  viewportWidth?: number;
}

export async function renderLongImage(
  pool: PlaywrightPool,
  html: string,
  opts?: RenderLongImageOpts
): Promise<Buffer> {
  const viewportWidth = opts?.viewportWidth ?? 750;
  return pool.withPage(async (page) => {
    await page.setViewportSize({ width: viewportWidth, height: 800 });
    await page.setContent(html, { waitUntil: "load" });
    const screenshot = await page.screenshot({ fullPage: true, type: "png" });
    return Buffer.from(screenshot);
  });
}
