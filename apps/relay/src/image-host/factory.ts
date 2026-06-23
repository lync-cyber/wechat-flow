import type { ImageHostConfig } from "../credentials/store.ts";
import { createLocalAdapter } from "./local.ts";
import { createQiniuAdapter } from "./qiniu.ts";
import type { ImageHostAdapter } from "./types.ts";

export function createAdapterFromConfig(config: ImageHostConfig): ImageHostAdapter {
  if (config.kind === "local") {
    return createLocalAdapter({
      baseDir: config.baseDir ?? "",
      publicBaseUrl: config.publicBaseUrl ?? "",
    });
  }

  if (config.kind === "qiniu") {
    return createQiniuAdapter({
      accessKey: config.credentials.accessKey ?? "",
      secretKey: config.credentials.secretKey ?? "",
      bucket: config.credentials.bucket ?? "",
      domain: config.credentials.domain ?? "",
    });
  }

  throw new Error(`Unsupported image host kind: ${config.kind}`);
}
