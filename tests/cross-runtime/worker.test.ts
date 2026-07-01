import { describe, expect, it } from "vitest";
import { EXPECTED_HASHES } from "./fixtures.ts";

interface WorkerResult {
  hashes?: Record<string, string>;
  error?: string;
}

describe("cross-runtime: Web Worker target", () => {
  it("renders every fixture to the golden SHA-256 inside a Web Worker", async () => {
    const worker = new Worker(new URL("./worker-entry.ts", import.meta.url), {
      type: "module",
    });
    try {
      const result = await new Promise<WorkerResult>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("worker timed out")), 30_000);
        worker.addEventListener("message", (event) => {
          clearTimeout(timer);
          resolve(event.data as WorkerResult);
        });
        worker.addEventListener("error", (event) => {
          clearTimeout(timer);
          reject(new Error(event.message));
        });
        worker.postMessage("start");
      });
      expect(result.error).toBeUndefined();
      expect(result.hashes).toEqual(EXPECTED_HASHES);
    } finally {
      worker.terminate();
    }
  });
});
