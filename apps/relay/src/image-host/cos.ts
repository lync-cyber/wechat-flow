import { createHash, createHmac } from "node:crypto";
import type { HttpRequest } from "./http.ts";
import { defaultHttpRequest } from "./http.ts";
import { sanitizeObjectKey } from "./keys.ts";
import type { ImageHostAdapter, UploadMeta, UploadResult } from "./types.ts";

export interface CosConfig {
  secretId: string;
  secretKey: string;
  bucket: string;
  region: string;
  domain?: string;
}

function sha1Hex(data: string): string {
  return createHash("sha1").update(data).digest("hex");
}

function hmacSha1Hex(key: string, data: string): string {
  return createHmac("sha1", key).update(data).digest("hex");
}

function buildCosKey(meta: UploadMeta): string {
  return meta.filename ? sanitizeObjectKey(meta.filename) : `upload_${Date.now()}`;
}

export function createCosAdapter(
  config: CosConfig,
  deps?: { httpRequest?: HttpRequest }
): ImageHostAdapter {
  const httpRequest = deps?.httpRequest ?? defaultHttpRequest;

  return {
    name: "cos",
    async upload(data: Uint8Array, meta: UploadMeta): Promise<UploadResult> {
      const key = buildCosKey(meta);
      const host = `${config.bucket}.cos.${config.region}.myqcloud.com`;
      const url = `https://${host}/${key}`;

      const now = Math.floor(Date.now() / 1000);
      const signTime = `${now};${now + 3600}`;
      const signKey = hmacSha1Hex(config.secretKey, signTime);
      const httpString = `PUT\n/${key}\n\n\n`;
      const stringToSign = `sha1\n${signTime}\n${sha1Hex(httpString)}\n`;
      const sig = hmacSha1Hex(signKey, stringToSign);

      const authorization =
        `q-sign-algorithm=sha1&q-ak=${config.secretId}` +
        `&q-sign-time=${signTime}&q-key-time=${signTime}` +
        `&q-header-list=&q-url-param-list=&q-signature=${sig}`;

      const ab = new ArrayBuffer(data.byteLength);
      new Uint8Array(ab).set(data);

      const res = await httpRequest(url, {
        method: "PUT",
        headers: {
          Authorization: authorization,
          "Content-Type": meta.contentType,
        },
        body: ab,
      });

      if (!res.ok) {
        throw new Error(`COS upload failed: ${res.status}`);
      }

      const resultUrl = config.domain ? `${config.domain}/${key}` : `https://${host}/${key}`;
      return { url: resultUrl };
    },
  };
}
