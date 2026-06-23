import type { HttpRequest } from "./http.ts";
import { defaultHttpRequest } from "./http.ts";
import type { ImageHostAdapter, UploadMeta, UploadResult } from "./types.ts";

export interface CustomConfig {
  endpoint: string;
  token?: string;
  responseUrlField?: string;
}

export function createCustomAdapter(
  config: CustomConfig,
  deps?: { httpRequest?: HttpRequest }
): ImageHostAdapter {
  const httpRequest = deps?.httpRequest ?? defaultHttpRequest;
  const urlField = config.responseUrlField ?? "url";

  return {
    name: "custom",
    async upload(data: Uint8Array, meta: UploadMeta): Promise<UploadResult> {
      if (!/^https?:\/\//i.test(config.endpoint)) {
        throw new Error("Custom upload endpoint must be an http(s) URL");
      }

      const ab = new ArrayBuffer(data.byteLength);
      new Uint8Array(ab).set(data);
      const form = new FormData();
      form.append("file", new Blob([ab], { type: meta.contentType }), meta.filename);

      const headers: Record<string, string> = {};
      if (config.token) {
        headers.Authorization = `Bearer ${config.token}`;
      }

      const res = await httpRequest(config.endpoint, {
        method: "POST",
        headers,
        body: form,
      });

      if (!res.ok) {
        throw new Error(`Custom upload failed: ${res.status}`);
      }

      const body = (await res.json()) as Record<string, unknown>;
      const url = body[urlField];
      if (typeof url !== "string") {
        throw new Error(`Custom upload: response missing '${urlField}' field`);
      }

      return { url };
    },
  };
}
