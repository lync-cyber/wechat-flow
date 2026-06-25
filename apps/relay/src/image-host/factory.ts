import type { ImageHostConfig } from "../credentials/store.ts";
import { createCosAdapter } from "./cos.ts";
import { createCustomAdapter } from "./custom.ts";
import { createLocalAdapter } from "./local.ts";
import { createOssAdapter } from "./oss.ts";
import { createQiniuAdapter } from "./qiniu.ts";
import { createSmmsAdapter } from "./smms.ts";
import type { ImageHostAdapter } from "./types.ts";

function requireCredentials(
  kind: string,
  credentials: Record<string, string | undefined>,
  fields: string[]
): void {
  const missing = fields.filter((field) => {
    const value = credentials[field];
    return value === undefined || value.length === 0;
  });
  if (missing.length > 0) {
    throw new Error(`Image host "${kind}" is missing required credentials: ${missing.join(", ")}`);
  }
}

export function createAdapterFromConfig(config: ImageHostConfig): ImageHostAdapter {
  if (config.kind === "local") {
    return createLocalAdapter({
      baseDir: config.baseDir ?? "",
      publicBaseUrl: config.publicBaseUrl ?? "",
    });
  }

  if (config.kind === "qiniu") {
    requireCredentials("qiniu", config.credentials, ["accessKey", "secretKey", "bucket", "domain"]);
    return createQiniuAdapter({
      accessKey: config.credentials.accessKey ?? "",
      secretKey: config.credentials.secretKey ?? "",
      bucket: config.credentials.bucket ?? "",
      domain: config.credentials.domain ?? "",
    });
  }

  if (config.kind === "oss") {
    requireCredentials("oss", config.credentials, [
      "accessKeyId",
      "accessKeySecret",
      "bucket",
      "region",
    ]);
    return createOssAdapter({
      accessKeyId: config.credentials.accessKeyId ?? "",
      accessKeySecret: config.credentials.accessKeySecret ?? "",
      bucket: config.credentials.bucket ?? "",
      region: config.credentials.region ?? "",
      domain: config.credentials.domain || undefined,
    });
  }

  if (config.kind === "cos") {
    requireCredentials("cos", config.credentials, ["secretId", "secretKey", "bucket", "region"]);
    return createCosAdapter({
      secretId: config.credentials.secretId ?? "",
      secretKey: config.credentials.secretKey ?? "",
      bucket: config.credentials.bucket ?? "",
      region: config.credentials.region ?? "",
      domain: config.credentials.domain || undefined,
    });
  }

  if (config.kind === "smms") {
    requireCredentials("smms", config.credentials, ["token"]);
    return createSmmsAdapter({
      token: config.credentials.token ?? "",
    });
  }

  if (config.kind === "custom") {
    requireCredentials("custom", config.credentials, ["endpoint"]);
    return createCustomAdapter({
      endpoint: config.credentials.endpoint ?? "",
      token: config.credentials.token || undefined,
      responseUrlField: config.credentials.responseUrlField || undefined,
    });
  }

  throw new Error(`Unsupported image host kind: ${config.kind}`);
}
