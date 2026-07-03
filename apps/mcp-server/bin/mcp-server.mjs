#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// The package ships TS source; --experimental-strip-types covers Node 22.x
// where type stripping is not yet the default.
const entry = fileURLToPath(new URL("../src/transport/stdio-entry.ts", import.meta.url));

const child = spawn(
  process.execPath,
  ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", entry],
  { stdio: "inherit" }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
