import { Hono } from "hono";
import type { ImageHostAdapter } from "./image-host/types.ts";
import { healthRoute } from "./routes/health.ts";
import { createImagesApp } from "./routes/images.ts";

export interface AppDeps {
  imagesAdapter?: ImageHostAdapter;
}

export function createApp(deps: AppDeps = {}): Hono {
  const app = new Hono();
  app.route("/health", healthRoute);
  if (deps.imagesAdapter) {
    app.route("/", createImagesApp({ adapter: deps.imagesAdapter }));
  }
  return app;
}
