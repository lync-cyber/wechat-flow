import { startStdioTransport } from "./transport/stdio.ts";

export { startStdioTransport } from "./transport/stdio.ts";
export { createServer } from "./transport/stdio.ts";

export async function main(start: () => Promise<void> = startStdioTransport): Promise<void> {
  await start();
}
