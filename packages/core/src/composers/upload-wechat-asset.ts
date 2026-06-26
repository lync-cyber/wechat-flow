export type WechatAssetType = "image" | "voice" | "video" | "thumb";

export type JobHandle = { jobId: string };

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export interface WechatAssetRelayClient {
  uploadWechatAsset(input: { imageUrl: string; type: WechatAssetType }): Promise<JobHandle>;
}

const VALID_TYPES = new Set<string>(["image", "voice", "video", "thumb"]);

function validate(imageUrl: string, type: unknown): void {
  if (typeof imageUrl !== "string" || !imageUrl.startsWith("https://")) {
    throw new ValidationError("imageUrl must be an https URL");
  }
  if (typeof type !== "string" || !VALID_TYPES.has(type)) {
    throw new ValidationError("type must be one of: image, voice, video, thumb");
  }
}

export async function composeUploadWechatAsset(
  input: { imageUrl: string; type: WechatAssetType },
  client: WechatAssetRelayClient
): Promise<JobHandle> {
  validate(input.imageUrl, input.type);
  return client.uploadWechatAsset({ imageUrl: input.imageUrl, type: input.type });
}

export type EventSourceFactory = (url: string) => EventSource;

export function subscribeJob(
  jobId: string,
  onProgress: (percent: number) => void,
  onComplete: (result: unknown) => void,
  onError: (error: { code: string; message: string }) => void,
  eventSourceFactory?: EventSourceFactory
): () => void {
  const factory = eventSourceFactory ?? ((url: string) => new EventSource(url));
  const es = factory(`/api/v1/jobs/${jobId}/events`);

  function close() {
    es.close();
  }

  es.addEventListener("progress", (e: Event) => {
    const data = JSON.parse((e as MessageEvent).data) as { progress: number };
    onProgress(data.progress);
  });

  es.addEventListener("succeeded", (e: Event) => {
    const data = JSON.parse((e as MessageEvent).data) as { result: unknown };
    onComplete(data.result);
    close();
  });

  es.addEventListener("failed", (e: Event) => {
    const data = JSON.parse((e as MessageEvent).data) as {
      error: { code: string; message: string };
    };
    onError(data.error);
    close();
  });

  return close;
}
