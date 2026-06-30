import { spawnSync } from "node:child_process";

const result = spawnSync("vitest", ["run", "tests/core/e2e/"], {
  env: { ...process.env, UPDATE_SNAPSHOTS: "1" },
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
