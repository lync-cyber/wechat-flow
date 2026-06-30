import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { measureColdStart } from "./cold-start.ts";
import { checkThresholds, toExitCode } from "./perf-runner.ts";
import { measureThemeSwitch } from "./theme-switch.ts";
import { measureTypingLatency } from "./typing-latency.ts";

GlobalRegistrator.register();

const typingLimit = Number(process.env.PERF_TYPING_P95_MS ?? 50);
const themeLimit = Number(process.env.PERF_THEME_P95_MS ?? 200);
const coldStartLimit = Number(process.env.PERF_COLDSTART_P95_MS ?? 800);

const typingResult = await measureTypingLatency();
const themeResult = await measureThemeSwitch();
const coldStartResult = await measureColdStart();

const results = [typingResult, themeResult, coldStartResult];

const report = {
  timestamp: new Date().toISOString(),
  results: results.map((r) => ({
    name: r.name,
    p50: r.p50,
    p95: r.p95,
    p99: r.p99,
    samples: r.samples,
    env: r.env,
  })),
};

const outPath = resolve("perf-report.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`perf-report.json written to ${outPath}`);

const check = checkThresholds(results, {
  "typing-latency": typingLimit,
  "theme-switch": themeLimit,
  "cold-start": coldStartLimit,
});

if (!check.passed) {
  for (const b of check.breaches) {
    console.error(`BREACH: ${b.name} p95=${b.p95.toFixed(2)}ms > limit=${b.limit}ms`);
  }
}

process.exit(toExitCode(check));
