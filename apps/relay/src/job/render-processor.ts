import { persistExport } from "../headless/persist-export.ts";
import type { PlaywrightPool } from "../headless/playwright-pool.ts";
import { renderCover } from "../headless/render-cover.ts";
import type { CoverFormat } from "../headless/render-cover.ts";
import { renderLongImage } from "../headless/render-long-image.ts";
import type { JobKind } from "./types.ts";

export interface RenderJobData {
  kind: JobKind;
  apiKeyId: string;
  filename: string;
  input: { html: string; viewportWidth?: number; format?: CoverFormat };
}

export interface RenderJob {
  data: RenderJobData;
  updateProgress(progress: number): Promise<void>;
}

export interface RenderResult {
  url: string;
}

export function createRenderProcessor(pool: PlaywrightPool, opts: { exportDir?: string } = {}) {
  return async (job: RenderJob): Promise<RenderResult> => {
    const { kind, input, filename } = job.data;
    await job.updateProgress(0.1);

    let png: Buffer;
    if (kind === "long-image-render") {
      png = await renderLongImage(pool, input.html, { viewportWidth: input.viewportWidth });
    } else if (kind === "cover-render") {
      if (!input.format) throw new Error("cover-render requires input.format");
      png = await renderCover(pool, input.html, { format: input.format });
    } else {
      throw new Error(`unsupported render kind: ${kind}`);
    }

    await job.updateProgress(0.8);
    const { url } = await persistExport(png, { dir: opts.exportDir, filename });
    await job.updateProgress(1);
    return { url };
  };
}
