#!/usr/bin/env node
// Bring the CataForge KG store into a ready state for the current environment.
// The RocksDB store under .cataforge/kg/store is gitignored, so a fresh clone
// has no graph until this runs. Preference order: keep an existing store as-is
// → restore the newest committed .nq snapshot → rebuild from committed markdown.

import { execFileSync, execSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const storeDir = join(projectRoot, ".cataforge", "kg", "store");
const snapshotsDir = join(projectRoot, ".cataforge", "kg", "snapshots");

function log(msg) {
  console.log(`[kg-restore] ${msg}`);
}

function cataforgeAvailable() {
  try {
    execSync("cataforge --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function run(args) {
  log(`cataforge ${args.join(" ")}`);
  execFileSync("cataforge", args, { cwd: projectRoot, stdio: "inherit", shell: true });
}

function latestSnapshot() {
  if (!existsSync(snapshotsDir)) return null;
  const candidates = readdirSync(snapshotsDir)
    .filter((f) => f.endsWith(".nq"))
    .map((f) => join(snapshotsDir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return candidates[0] ?? null;
}

function storePopulated() {
  return existsSync(storeDir) && readdirSync(storeDir).length > 0;
}

function main() {
  if (storePopulated()) {
    log("store already present — nothing to do.");
    return;
  }
  // A missing CLI must not break `pnpm install`; the store is optional at install time.
  if (!cataforgeAvailable()) {
    log("cataforge CLI not found on PATH — skipping (install it, then run `pnpm kg:restore`).");
    return;
  }

  const snapshot = latestSnapshot();
  if (snapshot) {
    run(["kg", "rollback", snapshot, "--force"]);
    log("restored store from snapshot.");
    return;
  }

  log("no snapshot found — rebuilding from markdown.");
  run(["kg", "init"]);
  run(["kg", "import"]);
  log("rebuilt store from markdown.");
}

main();
