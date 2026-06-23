import { serve } from "@hono/node-server";
import { loadImageHostConfig } from "./credentials/store.ts";
import { createAdapterFromConfig } from "./image-host/factory.ts";
import { createApp } from "./index.ts";

const imagesAdapter = createAdapterFromConfig(loadImageHostConfig(process.env));
const app = createApp({ imagesAdapter });

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`relay listening on http://localhost:${info.port}`);
});
