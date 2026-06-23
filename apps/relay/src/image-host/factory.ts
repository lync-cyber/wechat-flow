import type { ImageHostConfig } from "../credentials/store.ts";
import { createCosAdapter } from "./cos.ts";
import { createCustomAdapter } from "./custom.ts";
import { createLocalAdapter } from "./local.ts";
import { createOssAdapter } from "./oss.ts";
import { createQiniuAdapter } from "./qiniu.ts";
import { createSmmsAdapter } from "./smms.ts";
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

  if (config.kind === "oss") {
    return createOssAdapter({
      accessKeyId: config.credentials.accessKeyId ?? "",
      accessKeySecret: config.credentials.accessKeySecret ?? "",
      bucket: config.credentials.bucket ?? "",
      region: config.credentials.region ?? "",
      domain: config.credentials.domain || undefined,
    });
  }

  if (config.kind === "cos") {
    return createCosAdapter({
      secretId: config.credentials.secretId ?? "",
      secretKey: config.credentials.secretKey ?? "",
      bucket: config.credentials.bucket ?? "",
      region: config.credentials.region ?? "",
      domain: config.credentials.domain || undefined,
    });
  }

  if (config.kind === "smms") {
    return createSmmsAdapter({
      token: config.credentials.token ?? "",
    });
  }

  if (config.kind === "custom") {
    return createCustomAdapter({
      endpoint: config.credentials.endpoint ?? "",
      token: config.credentials.token || undefined,
      responseUrlField: config.credentials.responseUrlField || undefined,
    });
  }

  throw new Error(`Unsupported image host kind: ${config.kind}`);
}
