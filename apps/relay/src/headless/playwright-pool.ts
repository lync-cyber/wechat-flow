import { chromium } from "playwright";
import type { Browser, Page } from "playwright";

export interface PlaywrightPool {
  withPage<T>(fn: (page: Page) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export function createPlaywrightPool(opts?: { size?: number }): PlaywrightPool {
  const size = opts?.size ?? 1;
  const browsers: Browser[] = [];
  let nextIndex = 0;

  async function ensureBrowsers(): Promise<void> {
    while (browsers.length < size) {
      const browser = await chromium.launch({ headless: true, channel: "chromium" });
      browsers.push(browser);
    }
  }

  async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
    await ensureBrowsers();
    const browser = browsers[nextIndex % browsers.length];
    nextIndex++;
    const page = await browser.newPage();
    try {
      return await fn(page);
    } finally {
      await page.close();
    }
  }

  async function close(): Promise<void> {
    await Promise.all(browsers.map((b) => b.close()));
    browsers.length = 0;
  }

  return { withPage, close };
}

export type { Browser, Page };
