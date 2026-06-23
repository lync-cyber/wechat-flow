import { createHash, createHmac } from "node:crypto";
import type { ImageHostAdapter, UploadMeta, UploadResult } from "./types.ts";

export interface QiniuConfig {
  accessKey: string;
  secretKey: string;
  bucket: string;
  domain: string;
}

export type HttpPost = (
  url: string,
  formData: FormData
) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildUploadToken(config: QiniuConfig): string {
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  const putPolicy = JSON.stringify({ scope: config.bucket, deadline });
  const encodedPolicy = base64url(Buffer.from(putPolicy));
  const sign = base64url(createHmac("sha1", config.secretKey).update(encodedPolicy).digest());
  return `${config.accessKey}:${sign}:${encodedPolicy}`;
}

function deriveKey(meta: UploadMeta, data: Uint8Array): string {
  if (meta.filename) {
    return meta.filename.replace(/[/\\]/g, "_").replace(/\.\./g, "_");
  }
  return createHash("sha256").update(data).digest("hex");
}

const defaultHttpPost: HttpPost = (url, formData) => fetch(url, { method: "POST", body: formData });

export function createQiniuAdapter(
  config: QiniuConfig,
  deps?: { httpPost?: HttpPost }
): ImageHostAdapter {
  const httpPost = deps?.httpPost ?? defaultHttpPost;

  return {
    name: "qiniu",
    async upload(data: Uint8Array, meta: UploadMeta): Promise<UploadResult> {
      const token = buildUploadToken(config);
      const key = deriveKey(meta, data);

      const form = new FormData();
      form.append("token", token);
      form.append("key", key);
      const fileBlob = new Blob([data.buffer as ArrayBuffer], { type: meta.contentType });
      form.append("file", fileBlob, meta.filename);

      const res = await httpPost("https://up.qiniup.com", form);
      if (!res.ok) {
        throw new Error("Qiniu upload failed");
      }

      return { url: `${config.domain}/${encodeURIComponent(key)}` };
    },
  };
}
