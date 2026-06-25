import { Hono } from "hono";
import type { EditorSessionDeps } from "./auth/editor-session.ts";
import { errorResponse } from "./http/error.ts";
import type { ImageHostAdapter } from "./image-host/types.ts";
import type { JobsAppDeps } from "./job/types.ts";
import {
  type AuthMiddlewareDeps,
  type AuthVariables,
  createAuthMiddleware,
} from "./middleware/auth.ts";
import { createEditorSessionApp } from "./routes/editor-session.ts";
import { healthRoute } from "./routes/health.ts";
import { createImagesApp } from "./routes/images.ts";
import { createJobsApp } from "./routes/jobs.ts";

export interface AppDeps {
  imagesAdapter?: ImageHostAdapter;
  jobsDeps?: JobsAppDeps;
  auth?: AuthMiddlewareDeps;
  editorSession?: EditorSessionDeps;
}

export function createApp(deps: AppDeps = {}): Hono<{ Variables: AuthVariables }> {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.route("/health", healthRoute);

  if (deps.editorSession) {
    app.route("/", createEditorSessionApp(deps.editorSession));
  }

  if (deps.imagesAdapter) {
    if (deps.auth) {
      app.use("/api/v1/images/upload", createAuthMiddleware(deps.auth, { requireScope: "upload" }));
    }
    app.route("/", createImagesApp({ adapter: deps.imagesAdapter }));
  }

  if (deps.jobsDeps) {
    if (deps.auth) {
      app.use("/api/v1/jobs", createAuthMiddleware(deps.auth));
    }
    app.route("/", createJobsApp(deps.jobsDeps));
  }

  if (deps.auth) {
    app.use("/api/v1/admin/*", createAuthMiddleware(deps.auth, { requireScope: "admin" }));
    app.post("/api/v1/admin/api-keys", (c) =>
      errorResponse(c, 501, "E_NOT_IMPLEMENTED", "admin api-keys management is not implemented")
    );
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
