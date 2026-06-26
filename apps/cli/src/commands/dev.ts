import * as fs from "node:fs";

export interface FileWatcher {
  close(): void;
}

export interface DevOptions {
  packDir: string;
  watcher?: (packDir: string, onChange: (filename: string) => void) => FileWatcher;
  logger?: (line: string) => void;
  serverFactory?: () => void;
}

export interface DevHandle {
  close(): void;
}

export function formatHmrMessage(filePath: string): string {
  return `[wechat-flow:hmr] ${filePath} updated`;
}

function defaultWatcher(packDir: string, onChange: (filename: string) => void): FileWatcher {
  const watcher = fs.watch(packDir, { recursive: true }, (_event, filename) => {
    if (filename) onChange(filename);
  });
  return { close: () => watcher.close() };
}

export function runDev(opts: DevOptions): DevHandle {
  const log = opts.logger ?? ((line: string) => console.log(line));
  const watchFn = opts.watcher ?? defaultWatcher;

  log("Watching for changes...");

  if (opts.serverFactory) {
    opts.serverFactory();
  }

  const handle = watchFn(opts.packDir, (changedPath) => {
    log(formatHmrMessage(changedPath));
  });

  return { close: () => handle.close() };
}
