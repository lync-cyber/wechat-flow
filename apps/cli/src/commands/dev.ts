import * as fs from "node:fs";
import { createServer } from "vite";

export interface FileWatcher {
  close(): void;
}

export interface ViteServerLike {
  ws: { send: (payload: unknown) => void };
}

export interface DevOptions {
  packDir: string;
  watcher?: (packDir: string, onChange: (filename: string) => void) => FileWatcher;
  logger?: (line: string) => void;
  serverFactory?: (opts: { root: string }) => ViteServerLike;
}

export interface DevHandle {
  close(): void;
}

export function formatHmrMessage(opts: { type: string; packDir: string }): Record<string, unknown> {
  return { type: opts.type, packDir: opts.packDir };
}

function defaultWatcher(packDir: string, onChange: (filename: string) => void): FileWatcher {
  const watcher = fs.watch(packDir, { recursive: true }, (_event, filename) => {
    if (filename) onChange(filename);
  });
  return { close: () => watcher.close() };
}

function defaultServerFactory(opts: { root: string }): ViteServerLike {
  let _server: ViteServerLike | null = null;
  createServer({ root: opts.root }).then((s) => {
    _server = s as unknown as ViteServerLike;
  });
  return {
    ws: {
      send: (payload: unknown) => {
        if (_server) {
          (_server as ViteServerLike).ws.send(payload);
        }
      },
    },
  };
}

export function runDev(opts: DevOptions): DevHandle {
  const log = opts.logger ?? ((line: string) => console.log(line));
  const watchFn = opts.watcher ?? defaultWatcher;
  const serverFactory = opts.serverFactory ?? defaultServerFactory;

  log("Watching for changes...");

  const server = serverFactory({ root: opts.packDir });

  const handle = watchFn(opts.packDir, (_changedPath) => {
    server.ws.send(formatHmrMessage({ type: "full-reload", packDir: opts.packDir }));
  });

  return { close: () => handle.close() };
}
