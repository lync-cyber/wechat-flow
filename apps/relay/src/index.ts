import { Hono } from "hono";
import type { EditorSessionDeps } from "./auth/editor-session.ts";
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

/**
 * Dependencies for the admin route group (/api/v1/admin/*).
 *
 * For complete double-layer authentication, supply `auth` alongside `adminDeps`
 * in `AppDeps` so that relay-level JWT middleware (requireScope: "admin") runs
 * before the admin app's internal guard. When used without `auth`, protection
 * relies solely on the internal guard inside `adminDeps.app`.
 */
export interface AdminDeps {
  /** Pre-constructed admin API keys Hono app (from createAdminApiKeysApp). */
  app: Hono;
}

export interface AppDeps {
  imagesAdapter?: ImageHostAdapter;
  jobsDeps?: JobsAppDeps;
  auth?: AuthMiddlewareDeps;
  editorSession?: EditorSessionDeps;
  adminDeps?: AdminDeps;
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
  }

  if (deps.adminDeps) {
    app.route("/api/v1", deps.adminDeps.app);
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
export { createWechatAssetsApp } from "./routes/wechat-assets.ts";
export type { WechatAssetsAppDeps } from "./routes/wechat-assets.ts";
export { loadWechatCredentials } from "./wechat-asset/credential-loader.ts";
export type { WechatCredentials } from "./wechat-asset/credential-loader.ts";
export { uploadWechatAsset } from "./wechat-asset/uploader.ts";
export type {
  WechatAssetUploadInput,
  WechatUploadCredentials,
  WechatUploaderDeps,
  WechatUploadResult,
} from "./wechat-asset/uploader.ts";
export { createAdminApiKeysApp } from "./admin/api-keys.ts";
export { createAdminGuard } from "./auth/admin-guard.ts";
