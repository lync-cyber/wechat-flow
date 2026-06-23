import { Hono } from "hono";
import { healthRoute } from "./routes/health.ts";

export function createApp(): Hono {
  const app = new Hono();
  app.route("/health", healthRoute);
  return app;
}

export const app = createApp();
