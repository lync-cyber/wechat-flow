import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runPublish } from "../../apps/cli/src/commands/publish.ts";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-publish-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function createPack(dir: string, name = "my-pack"): string {
  const packDir = path.join(dir, name);
  fs.mkdirSync(path.join(packDir, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(packDir, "manifest.json"),
    JSON.stringify({ name, id: name, type: "theme" }),
    "utf-8"
  );
  fs.writeFileSync(path.join(packDir, "src", "index.ts"), "export default {};\n", "utf-8");
  return packDir;
}

describe("AC-004: runPublish detects new pack version", () => {
  it("stdout contains 'new pack version detected' on first publish, exitCode 0", () => {
    const packDir = createPack(tmpDir);

    const result = runPublish({ packDir });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("new pack version detected");
  });

  it("returns no new version message when pack is unchanged", () => {
    const packDir = createPack(tmpDir);

    runPublish({ packDir });
    const second = runPublish({ packDir });

    expect(second.exitCode).toBe(0);
    expect(second.stdout).not.toContain("new pack version detected");
  });

  it("detects new version when pack file changes", () => {
    const packDir = createPack(tmpDir);

    runPublish({ packDir });

    fs.writeFileSync(
      path.join(packDir, "src", "index.ts"),
      "export default { changed: true };\n",
      "utf-8"
    );
    const result = runPublish({ packDir });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("new pack version detected");
  });

  it("treats missing state file as first publish (new version detected)", () => {
    const packDir = createPack(tmpDir);
    const stateFile = path.join(packDir, ".wf-publish-state.json");
    expect(fs.existsSync(stateFile)).toBe(false);

    const result = runPublish({ packDir });

    expect(result.stdout).toContain("new pack version detected");
  });

  it("writes .wf-publish-state.json after publish", () => {
    const packDir = createPack(tmpDir);

    runPublish({ packDir });

    const stateFile = path.join(packDir, ".wf-publish-state.json");
    expect(fs.existsSync(stateFile)).toBe(true);
    const state = JSON.parse(fs.readFileSync(stateFile, "utf-8")) as { lastHash: string };
    expect(typeof state.lastHash).toBe("string");
    expect(state.lastHash.length).toBeGreaterThan(0);
  });
});
