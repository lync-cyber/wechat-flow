import { computeFixtureHashes } from "./fixtures.ts";

const ctx = globalThis as unknown as {
  postMessage: (message: unknown) => void;
  addEventListener: (type: string, listener: (event: { data: unknown }) => void) => void;
};

ctx.addEventListener("message", async () => {
  try {
    ctx.postMessage({ hashes: await computeFixtureHashes() });
  } catch (error) {
    ctx.postMessage({ error: String((error as Error)?.stack ?? error) });
  }
});
