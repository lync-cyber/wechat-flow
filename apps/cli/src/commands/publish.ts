import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

export interface PublishOptions {
  packDir: string;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

const STATE_FILE = ".wf-publish-state.json";

function computePackHash(packDir: string): string {
  const hasher = crypto.createHash("sha256");

  const manifestPath = path.join(packDir, "manifest.json");
  if (fs.existsSync(manifestPath)) {
    hasher.update("manifest.json:");
    hasher.update(fs.readFileSync(manifestPath, "utf-8"));
    hasher.update("\n");
  }

  const srcDir = path.join(packDir, "src");
  if (fs.existsSync(srcDir)) {
    const files = fs.readdirSync(srcDir).sort();
    for (const file of files) {
      const filePath = path.join(srcDir, file);
      if (fs.statSync(filePath).isFile()) {
        hasher.update(`src/${file}:`);
        hasher.update(fs.readFileSync(filePath, "utf-8"));
        hasher.update("\n");
      }
    }
  }

  return hasher.digest("hex");
}

function readLastHash(packDir: string): string | null {
  const statePath = path.join(packDir, STATE_FILE);
  try {
    const raw = fs.readFileSync(statePath, "utf-8");
    const parsed = JSON.parse(raw) as { lastHash?: string };
    return parsed.lastHash ?? null;
  } catch {
    return null;
  }
}

function writeLastHash(packDir: string, hash: string): void {
  const statePath = path.join(packDir, STATE_FILE);
  fs.writeFileSync(statePath, JSON.stringify({ lastHash: hash }), "utf-8");
}

export function runPublish(opts: PublishOptions): CommandResult {
  const currentHash = computePackHash(opts.packDir);
  const lastHash = readLastHash(opts.packDir);

  writeLastHash(opts.packDir, currentHash);

  if (lastHash === null || currentHash !== lastHash) {
    return { exitCode: 0, stdout: "new pack version detected", stderr: "" };
  }

  return { exitCode: 0, stdout: "No changes detected since last publish", stderr: "" };
}
