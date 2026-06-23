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

  throw new Error(`Unsupported IMAGE_HOST kind: ${kind}`);
}
