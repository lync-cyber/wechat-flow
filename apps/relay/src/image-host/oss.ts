import { createHmac } from "node:crypto";
import type { HttpRequest } from "./http.ts";
import { defaultHttpRequest } from "./http.ts";
import { sanitizeObjectKey } from "./keys.ts";
import type { ImageHostAdapter, UploadMeta, UploadResult } from "./types.ts";

export interface OssConfig {
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  region: string;
  domain?: string;
}

function hmacSha1Base64(key: string, data: string): string {
  return createHmac("sha1", key).update(data).digest("base64");
}

function buildOssKey(meta: UploadMeta): string {
  return meta.filename ? sanitizeObjectKey(meta.filename) : `upload_${Date.now()}`;
}

export function createOssAdapter(
  config: OssConfig,
  deps?: { httpRequest?: HttpRequest }
): ImageHostAdapter {
  const httpRequest = deps?.httpRequest ?? defaultHttpRequest;

  return {
    name: "oss",
    async upload(data: Uint8Array, meta: UploadMeta): Promise<UploadResult> {
      const key = buildOssKey(meta);
      const host = `${config.bucket}.${config.region}.aliyuncs.com`;
      const url = `https://${host}/${key}`;
      const date = new Date().toUTCString();
      const contentType = meta.contentType;

      const stringToSign = `PUT\n\n${contentType}\n${date}\n/${config.bucket}/${key}`;
      const sig = hmacSha1Base64(config.accessKeySecret, stringToSign);
      const authorization = `OSS ${config.accessKeyId}:${sig}`;

      const ab = new ArrayBuffer(data.byteLength);
      new Uint8Array(ab).set(data);

      const res = await httpRequest(url, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          Date: date,
          Authorization: authorization,
        },
        body: ab,
      });

      if (!res.ok) {
        throw new Error(`OSS upload failed: ${res.status}`);
      }

      const resultUrl = config.domain ? `${config.domain}/${key}` : `https://${host}/${key}`;

      return { url: resultUrl };
    },
  };
}
