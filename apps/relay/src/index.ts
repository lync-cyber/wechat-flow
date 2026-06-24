import { Hono } from "hono";
import type { ImageHostAdapter } from "./image-host/types.ts";
import type { JobsAppDeps } from "./job/types.ts";
import { healthRoute } from "./routes/health.ts";
import { createImagesApp } from "./routes/images.ts";
import { createJobsApp } from "./routes/jobs.ts";

export interface AppDeps {
  imagesAdapter?: ImageHostAdapter;
  jobsDeps?: JobsAppDeps;
}

export function createApp(deps: AppDeps = {}): Hono {
  const app = new Hono();
  app.route("/health", healthRoute);
  if (deps.imagesAdapter) {
    app.route("/", createImagesApp({ adapter: deps.imagesAdapter }));
  }
  if (deps.jobsDeps) {
    app.route("/", createJobsApp(deps.jobsDeps));
  }
  return app;
}

export { createPlaywrightPool } from "./headless/playwright-pool.ts";
export type { PlaywrightPool } from "./headless/playwright-pool.ts";
export { renderLongImage } from "./headless/render-long-image.ts";
export { COVER_DIMENSIONS, renderCover } from "./headless/render-cover.ts";
export { buildExportUrl, persistExport, resolveExportDir } from "./headless/persist-export.ts";
export { createRenderProcessor } from "./job/render-processor.ts";
export type { RenderJob, RenderJobData, RenderResult } from "./job/render-processor.ts";
export { createJobsRuntime } from "./job/runtime.ts";
export type { JobsRuntime } from "./job/runtime.ts";
export type { JobKind } from "./job/types.ts";
