import { Hono } from "hono";
import { Gauge, Registry } from "prom-client";

export interface MetricsAppDeps {
  queueDepths: () => Promise<Record<string, number>>;
}

export function createMetricsApp(deps: MetricsAppDeps): Hono {
  const { queueDepths } = deps;
  const registry = new Registry();

  new Gauge({
    name: "job_queue_depth",
    help: "number of waiting jobs per BullMQ queue kind",
    labelNames: ["kind"],
    registers: [registry],
    async collect() {
      const depths = await queueDepths();
      for (const [kind, depth] of Object.entries(depths)) {
        this.set({ kind }, depth);
      }
    },
  });

  const app = new Hono();

  app.get("/metrics", async (c) => {
    const text = await registry.metrics();
    return c.text(text, 200, { "content-type": "text/plain; version=0.0.4; charset=utf-8" });
  });

  return app;
}
