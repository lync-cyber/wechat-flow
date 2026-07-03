import { randomUUID } from "node:crypto";
import type { EventEmitter } from "node:events";
import { Hono } from "hono";
import { errorResponse } from "../http/error.ts";
import { computeIdempotencyKey } from "../job/idempotency.ts";
import type { JobStore } from "../job/types.ts";
import type { UploadJobInput, UploadJobResult } from "../job/upload-processor.ts";
import { UploadJobError } from "../job/upload-processor.ts";
import type { AuthInfo, AuthVariables } from "../middleware/auth.ts";

export interface ImagesRouteDeps {
  store: JobStore;
  sseEmitter: EventEmitter;
  processUpload: (
    input: UploadJobInput,
    updateProgress: (progress: number) => Promise<void>
  ) => Promise<UploadJobResult>;
  maxBytes?: number;
}

export function createImagesApp(deps: ImagesRouteDeps): Hono<{ Variables: AuthVariables }> {
  const { store, sseEmitter, processUpload, maxBytes = 10 * 1024 * 1024 } = deps;
  const app = new Hono<{ Variables: AuthVariables }>();

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

    const filename = (file as { name?: string }).name ?? "upload";
    const auth = c.get("auth") as AuthInfo | undefined;
    const apiKeyId = auth?.sub ?? "anonymous";

    const jobId = randomUUID();
    const input: UploadJobInput = { data: Buffer.from(bytes).toString("base64"), filename };
    const idempotencyKey = computeIdempotencyKey({ jobId, apiKeyId }, "1.0.0");
    const now = new Date().toISOString();

    await store.upsert({
      jobId,
      state: "pending",
      kind: "image-upload",
      idempotencyKey,
      inputDigest: idempotencyKey,
      result: null,
      error: null,
      progress: 0,
      createdAt: now,
      updatedAt: now,
      apiKeyId,
    });

    setImmediate(() => {
      void processInBackground({ jobId, apiKeyId, idempotencyKey, createdAt: now, input });
    });

    return c.json({ jobId }, 202);
  });

  async function processInBackground(ctx: {
    jobId: string;
    apiKeyId: string;
    idempotencyKey: string;
    createdAt: string;
    input: UploadJobInput;
  }): Promise<void> {
    const { jobId, apiKeyId, idempotencyKey, createdAt, input } = ctx;

    try {
      await store.upsert({
        jobId,
        state: "running",
        kind: "image-upload",
        idempotencyKey,
        inputDigest: idempotencyKey,
        result: null,
        error: null,
        progress: 0,
        createdAt,
        updatedAt: new Date().toISOString(),
        apiKeyId,
      });
      sseEmitter.emit("active", { jobId });

      const updateProgress = async (progress: number): Promise<void> => {
        await store.upsert({
          jobId,
          state: "running",
          kind: "image-upload",
          idempotencyKey,
          inputDigest: idempotencyKey,
          result: null,
          error: null,
          progress,
          createdAt,
          updatedAt: new Date().toISOString(),
          apiKeyId,
        });
        sseEmitter.emit("progress", { jobId, data: progress });
      };

      const result = await processUpload(input, updateProgress);

      await store.upsert({
        jobId,
        state: "succeeded",
        kind: "image-upload",
        idempotencyKey,
        inputDigest: idempotencyKey,
        result,
        error: null,
        progress: 1,
        createdAt,
        updatedAt: new Date().toISOString(),
        apiKeyId,
      });
      sseEmitter.emit("completed", { jobId, returnvalue: result });
    } catch (err) {
      const error =
        err instanceof UploadJobError
          ? { code: err.code, message: err.message }
          : { code: "E_UPLOAD_FAILED", message: "image host rejected the upload" };

      await store.upsert({
        jobId,
        state: "failed",
        kind: "image-upload",
        idempotencyKey,
        inputDigest: idempotencyKey,
        result: null,
        error,
        progress: 0,
        createdAt,
        updatedAt: new Date().toISOString(),
        apiKeyId,
      });
      sseEmitter.emit("failed", { jobId, error });
    }
  }

  return app;
}
