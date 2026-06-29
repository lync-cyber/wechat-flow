import { startStdioTransport } from "./transport/stdio.ts";

export { startStdioTransport } from "./transport/stdio.ts";
export { createServer } from "./transport/stdio.ts";
export { createHttpTransportApp } from "./transport/http-sse.ts";
export type { HttpTransportDeps, TokenResolver } from "./transport/http-sse.ts";
export { startHttpTransport } from "./transport/http-entry.ts";

export async function main(start: () => Promise<void> = startStdioTransport): Promise<void> {
  await start();
}
