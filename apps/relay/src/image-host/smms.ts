import type { HttpRequest } from "./http.ts";
import { defaultHttpRequest } from "./http.ts";
import type { ImageHostAdapter, UploadMeta, UploadResult } from "./types.ts";

export interface SmmsConfig {
  token: string;
}

export function createSmmsAdapter(
  config: SmmsConfig,
  deps?: { httpRequest?: HttpRequest }
): ImageHostAdapter {
  const httpRequest = deps?.httpRequest ?? defaultHttpRequest;

  return {
    name: "smms",
    async upload(data: Uint8Array, meta: UploadMeta): Promise<UploadResult> {
      const ab = new ArrayBuffer(data.byteLength);
      new Uint8Array(ab).set(data);
      const form = new FormData();
      form.append("smfile", new Blob([ab], { type: meta.contentType }), meta.filename);

      const res = await httpRequest("https://sm.ms/api/v2/upload", {
        method: "POST",
        headers: { Authorization: config.token },
        body: form,
      });

      if (!res.ok) {
        throw new Error(`SM.MS upload failed: ${res.status}`);
      }

      const body = (await res.json()) as Record<string, unknown>;
      if (
        body.success === true &&
        body.data &&
        typeof (body.data as Record<string, unknown>).url === "string"
      ) {
        return { url: (body.data as Record<string, unknown>).url as string };
      }
      if (body.code === "image_repeated" && typeof body.images === "string") {
        return { url: body.images };
      }

      throw new Error("SM.MS upload: could not extract URL from response");
    },
  };
}
