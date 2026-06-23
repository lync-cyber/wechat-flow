export type ImageHostKind = "local" | "qiniu" | "oss" | "cos" | "smms" | "custom";

export interface ImageHostConfig {
  kind: ImageHostKind;
  credentials: Record<string, string>;
  baseDir?: string;
  publicBaseUrl?: string;
}

export function loadImageHostConfig(env: Record<string, string | undefined>): ImageHostConfig {
  const kind = env.IMAGE_HOST as ImageHostKind | undefined;
  if (!kind) {
    throw new Error("IMAGE_HOST environment variable is required");
  }

  if (kind === "local") {
    return {
      kind: "local",
      credentials: {},
      baseDir: env.LOCAL_BASE_DIR ?? "",
      publicBaseUrl: env.LOCAL_PUBLIC_BASE_URL ?? "",
    };
  }

  if (kind === "qiniu") {
    const accessKey = env.QINIU_ACCESS_KEY ?? "";
    const secretKey = env.QINIU_SECRET_KEY ?? "";
    const bucket = env.QINIU_BUCKET ?? "";
    const domain = env.QINIU_DOMAIN ?? "";
    return {
      kind: "qiniu",
      credentials: { accessKey, secretKey, bucket, domain },
    };
  }

  if (kind === "oss") {
    return {
      kind: "oss",
      credentials: {
        accessKeyId: env.OSS_ACCESS_KEY_ID ?? "",
        accessKeySecret: env.OSS_ACCESS_KEY_SECRET ?? "",
        bucket: env.OSS_BUCKET ?? "",
        region: env.OSS_REGION ?? "",
        ...(env.OSS_DOMAIN ? { domain: env.OSS_DOMAIN } : {}),
      },
    };
  }

  if (kind === "cos") {
    return {
      kind: "cos",
      credentials: {
        secretId: env.COS_SECRET_ID ?? "",
        secretKey: env.COS_SECRET_KEY ?? "",
        bucket: env.COS_BUCKET ?? "",
        region: env.COS_REGION ?? "",
        ...(env.COS_DOMAIN ? { domain: env.COS_DOMAIN } : {}),
      },
    };
  }

  if (kind === "smms") {
    return {
      kind: "smms",
      credentials: {
        token: env.SMMS_TOKEN ?? "",
      },
    };
  }

  if (kind === "custom") {
    return {
      kind: "custom",
      credentials: {
        endpoint: env.CUSTOM_UPLOAD_ENDPOINT ?? "",
        ...(env.CUSTOM_UPLOAD_TOKEN ? { token: env.CUSTOM_UPLOAD_TOKEN } : {}),
        ...(env.CUSTOM_RESPONSE_URL_FIELD
          ? { responseUrlField: env.CUSTOM_RESPONSE_URL_FIELD }
          : {}),
      },
    };
  }

  throw new Error(`Unsupported IMAGE_HOST kind: ${kind}`);
}
