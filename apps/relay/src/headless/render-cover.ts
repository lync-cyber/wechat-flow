import type { PlaywrightPool } from "./playwright-pool.ts";

export type CoverFormat = "landscape" | "square";

export interface RenderCoverOpts {
  format: CoverFormat;
}

export const COVER_DIMENSIONS: Record<CoverFormat, { width: number; height: number }> = {
  landscape: { width: 900, height: 383 },
  square: { width: 900, height: 900 },
};

export async function renderCover(
  pool: PlaywrightPool,
  html: string,
  opts: RenderCoverOpts
): Promise<Buffer> {
  const dims = COVER_DIMENSIONS[opts.format];
  return pool.withPage(async (page) => {
    await page.setViewportSize({ width: dims.width, height: dims.height });
    await page.setContent(html, { waitUntil: "load" });
    const screenshot = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: dims.width, height: dims.height },
    });
    return Buffer.from(screenshot);
  });
}
