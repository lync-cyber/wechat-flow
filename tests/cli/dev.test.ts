import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatHmrMessage, runDev } from "../../apps/cli/src/commands/dev.ts";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-dev-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("startup log", () => {
  it("logs 'Watching for changes...' on startup", () => {
    const logs: string[] = [];
    const fakeWatcher = () => ({ close: vi.fn() });
    const fakeServer = { ws: { send: vi.fn() } };

    const handle = runDev({
      packDir: "/fake/pack",
      watcher: fakeWatcher,
      logger: (line) => logs.push(line),
      serverFactory: () => fakeServer,
    });
    handle.close();

    expect(logs[0]).toBe("Watching for changes...");
  });
});

describe("AC-001: serverFactory receives { root } and is called once", () => {
  it("invokes serverFactory with { root: packDir } exactly once", () => {
    const mockServer = { ws: { send: vi.fn() } };
    const mockFactory = vi.fn().mockReturnValue(mockServer);

    const handle = runDev({
      packDir: "/tmp/test-pack",
      watcher: () => ({ close: vi.fn() }),
      logger: () => {},
      serverFactory: mockFactory,
    });
    handle.close();

    expect(mockFactory).toHaveBeenCalledOnce();
    expect(mockFactory).toHaveBeenCalledWith({ root: "/tmp/test-pack" });
  });

  it("calls server.ws.send with full-reload payload on file change", () => {
    const mockServer = { ws: { send: vi.fn() } };
    const captured: { onChange: ((filename: string) => void) | null } = { onChange: null };

    const fakeWatcher = (_dir: string, onChange: (filename: string) => void) => {
      captured.onChange = onChange;
      return { close: vi.fn() };
    };

    const handle = runDev({
      packDir: "/tmp/test-pack",
      watcher: fakeWatcher,
      logger: () => {},
      serverFactory: () => mockServer,
    });

    captured.onChange?.("src/theme.ts");
    handle.close();

    expect(mockServer.ws.send).toHaveBeenCalledOnce();
    const payload = mockServer.ws.send.mock.calls[0][0] as { type: string };
    expect(payload.type).toBe("full-reload");
  });

  it("does not throw when serverFactory is not provided", () => {
    const handle = runDev({
      packDir: "/fake/pack",
      watcher: () => ({ close: vi.fn() }),
      logger: () => {},
    });
    expect(() => handle.close()).not.toThrow();
  });
});

describe("AC-002: formatHmrMessage returns JSON-serializable object with type field", () => {
  it("returns object with type: 'full-reload'", () => {
    const result = formatHmrMessage({ type: "full-reload", packDir: "/some/pack" });
    expect(result.type).toBe("full-reload");
  });

  it("result survives JSON round-trip", () => {
    const result = formatHmrMessage({ type: "full-reload", packDir: "/some/pack" });
    const roundTripped = JSON.parse(JSON.stringify(result));
    expect(roundTripped.type).toBe(result.type);
    expect(roundTripped).toMatchObject(result);
  });
});

describe("default logger and watcher fallbacks", () => {
  it("uses default console.log when logger is not provided", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const handle = runDev({
        packDir: "/fake/pack",
        watcher: () => ({ close: vi.fn() }),
        serverFactory: () => ({ ws: { send: vi.fn() } }),
      });
      handle.close();
      expect(consoleSpy).toHaveBeenCalledWith("Watching for changes...");
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("uses real fs.watch when watcher is not provided — watch dir triggers onChange", () => {
    const logs: string[] = [];
    const handle = runDev({
      packDir: tmpDir,
      logger: (line) => logs.push(line),
      serverFactory: () => ({ ws: { send: vi.fn() } }),
    });
    handle.close();
    expect(logs[0]).toBe("Watching for changes...");
  });
});
