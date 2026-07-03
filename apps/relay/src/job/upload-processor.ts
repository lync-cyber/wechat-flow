import type { ImageHostAdapter } from "../image-host/types.ts";
import { preprocessImage } from "../image/preprocess.ts";

export interface UploadJobInput {
  data: string;
  filename?: string;
}

export interface UploadJobResult {
  url: string;
  size: number;
}

export class UploadJobError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "UploadJobError";
    this.code = code;
  }
}

export type UpdateProgress = (progress: number) => Promise<void>;

export function createUploadProcessor(adapter: ImageHostAdapter) {
  return async (
    input: UploadJobInput,
    updateProgress: UpdateProgress
  ): Promise<UploadJobResult> => {
    await updateProgress(0.1);

    const bytes = Uint8Array.from(Buffer.from(input.data, "base64"));

    let preprocessed: Awaited<ReturnType<typeof preprocessImage>>;
    try {
      preprocessed = await preprocessImage(bytes);
    } catch {
      throw new UploadJobError("E_INVALID_IMAGE", "uploaded file is not a decodable image");
    }

    await updateProgress(0.5);

    const filename = input.filename ?? "upload";
    const contentType = `image/${preprocessed.format}`;

    let uploadResult: Awaited<ReturnType<ImageHostAdapter["upload"]>>;
    try {
      uploadResult = await adapter.upload(preprocessed.data, { filename, contentType });
    } catch {
      throw new UploadJobError("E_UPLOAD_FAILED", "image host rejected the upload");
    }

    await updateProgress(0.9);

    return { url: uploadResult.url, size: preprocessed.data.length };
  };
}
