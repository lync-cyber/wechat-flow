import { describe, expect, it, vi } from "vitest";
import { formatHmrMessage, runDev } from "../../apps/cli/src/commands/dev.ts";

describe("AC-001: runDev prints Watching for changes...", () => {
  it("logs 'Watching for changes...' on startup", () => {
    const logs: string[] = [];
    const fakeWatcher = () => ({ close: vi.fn() });

    const handle = runDev({
      packDir: "/fake/pack",
      watcher: fakeWatcher,
      logger: (line) => logs.push(line),
    });
    handle.close();

    expect(logs[0]).toBe("Watching for changes...");
  });
});

describe("AC-002: file change triggers HMR message with [wechat-flow:hmr] prefix", () => {
  it("formatHmrMessage returns string with [wechat-flow:hmr] prefix", () => {
    const msg = formatHmrMessage("src/index.ts");
    expect(msg).toContain("[wechat-flow:hmr]");
    expect(msg).toContain("src/index.ts");
  });

  it("onChange callback produces HMR log entry", () => {
    const logs: string[] = [];
    const captured: { onChange: ((filename: string) => void) | null } = { onChange: null };

    const fakeWatcher = (_dir: string, onChange: (filename: string) => void) => {
      captured.onChange = onChange;
      return { close: vi.fn() };
    };

    const handle = runDev({
      packDir: "/fake/pack",
      watcher: fakeWatcher,
      logger: (line) => logs.push(line),
    });

    captured.onChange?.("src/theme.ts");
    handle.close();

    const hmrLog = logs.find((l) => l.includes("[wechat-flow:hmr]"));
    expect(hmrLog).toBeDefined();
    expect(hmrLog).toContain("src/theme.ts");
  });
});

describe("serverFactory injection", () => {
  it("invokes serverFactory when provided", () => {
    const factory = vi.fn();
    const handle = runDev({
      packDir: "/fake/pack",
      watcher: () => ({ close: vi.fn() }),
      logger: () => {},
      serverFactory: factory,
    });
    handle.close();
    expect(factory).toHaveBeenCalledOnce();
  });
});
