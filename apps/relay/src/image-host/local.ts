import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { ImageHostAdapter, UploadMeta, UploadResult } from "./types.ts";

export interface LocalHostConfig {
  baseDir: string;
  publicBaseUrl: string;
}

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
};

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);

function deriveExtension(meta: UploadMeta): string {
  const fromMime = MIME_TO_EXT[meta.contentType];
  if (fromMime) return fromMime;

  const fromFilename = extname(meta.filename).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(fromFilename)) return fromFilename;

  return ".bin";
}

export function createLocalAdapter(config: LocalHostConfig): ImageHostAdapter {
  return {
    name: "local",
    async upload(data: Uint8Array, meta: UploadMeta): Promise<UploadResult> {
      const hash = createHash("sha256").update(data).digest("hex").slice(0, 16);
      const ext = deriveExtension(meta);
      const filename = `${hash}${ext}`;
      await writeFile(join(config.baseDir, filename), data);
      return { url: `${config.publicBaseUrl}/${filename}` };
    },
  };
}
