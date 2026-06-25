import { Hono } from "hono";
import { errorResponse } from "../http/error.ts";
import type { ImageHostAdapter, UploadResult } from "../image-host/types.ts";
import { preprocessImage } from "../image/preprocess.ts";

export interface ImagesRouteDeps {
  adapter: ImageHostAdapter;
  maxBytes?: number;
}

export function createImagesApp(deps: ImagesRouteDeps): Hono {
  const { adapter, maxBytes = 10 * 1024 * 1024 } = deps;
  const app = new Hono();

  app.post("/api/v1/images/upload", async (c) => {
    let formData: FormData;
    try {
      formData = await c.req.formData();
    } catch {
      return errorResponse(
        c,
        400,
        "E_INVALID_BODY",
        "request body is not valid multipart form data"
      );
    }

    const file = formData.get("file");
    if (!file || typeof (file as Blob).arrayBuffer !== "function") {
      return errorResponse(c, 400, "E_INVALID_REQUEST", "missing 'file' field");
    }

    const blob = file as Blob;
    const bytes = new Uint8Array(await blob.arrayBuffer());

    if (bytes.byteLength > maxBytes) {
      return errorResponse(c, 413, "E_PAYLOAD_TOO_LARGE", "uploaded file exceeds the size limit");
    }

    let result: Awaited<ReturnType<typeof preprocessImage>>;
    try {
      result = await preprocessImage(bytes);
    } catch {
      return errorResponse(c, 400, "E_INVALID_IMAGE", "uploaded file is not a decodable image");
    }

    const filename = (file as { name?: string }).name ?? "upload";
    const contentType = `image/${result.format}`;

    let uploadResult: UploadResult;
    try {
      uploadResult = await adapter.upload(result.data, { filename, contentType });
    } catch {
      return errorResponse(c, 502, "E_UPLOAD_FAILED", "image host rejected the upload");
    }

    return c.json({ url: uploadResult.url, size: result.data.length }, 200);
  });

  return app;
}
