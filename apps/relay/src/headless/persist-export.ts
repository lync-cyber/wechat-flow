import fs from "node:fs/promises";
import path from "node:path";

export interface PersistExportOpts {
  dir?: string;
  filename: string;
}

export interface PersistExportResult {
  url: string;
  path: string;
}

export function buildExportUrl(filename: string): string {
  return `/exports/${filename}`;
}

export function resolveExportDir(dir?: string): string {
  return dir ?? path.join(process.cwd(), "public", "exports");
}

export async function persistExport(
  bytes: Buffer,
  opts: PersistExportOpts
): Promise<PersistExportResult> {
  const dir = resolveExportDir(opts.dir);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, opts.filename);
  await fs.writeFile(filePath, bytes);
  return { url: buildExportUrl(opts.filename), path: filePath };
}
