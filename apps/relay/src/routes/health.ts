import { Hono } from "hono";

export const RELAY_VERSION = process.env.npm_package_version ?? "0.0.0";

export const healthRoute = new Hono().get("/", (c) =>
  c.json({ status: "ok", version: RELAY_VERSION })
);
