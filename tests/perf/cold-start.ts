import os from "node:os";
import { performance } from "node:perf_hooks";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../apps/mcp-server/src/transport/stdio.ts";
import { resetThemeRegistry } from "../../packages/core/src/index.ts";
import { computePercentiles } from "./perf-runner.ts";
import type { BenchResult } from "./perf-runner.ts";

export async function measureColdStart(opts: { iterations?: number } = {}): Promise<BenchResult> {
  const { iterations = 50 } = opts;

  // warmup: one full cycle before measuring
  resetThemeRegistry();
  const warmupServer = createServer();
  const [warmupClient, warmupServer_] = InMemoryTransport.createLinkedPair();
  await warmupServer.connect(warmupServer_);
  await warmupServer.close();
  await warmupClient.close();

  const timings: number[] = [];
  for (let i = 0; i < iterations; i++) {
    resetThemeRegistry();
    const t0 = performance.now();
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    timings.push(performance.now() - t0);
    await server.close();
    await clientTransport.close();
  }

  return {
    name: "cold-start",
    ...computePercentiles(timings),
    samples: iterations,
    env: {
      cpu: os.cpus()[0]?.model ?? "unknown",
      node: process.version,
    },
  };
}
