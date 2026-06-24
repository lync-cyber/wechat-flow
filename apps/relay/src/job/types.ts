export type JobState = "pending" | "running" | "succeeded" | "failed";

export type JobKind = "image-upload" | "wechat-asset-upload" | "long-image-render" | "cover-render";

export interface JobError {
  code: string;
  message: string;
}

export interface JobRecord {
  jobId: string;
  state: JobState;
  kind: JobKind;
  idempotencyKey: string;
  inputDigest: string;
  result: unknown | null;
  error: JobError | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
  apiKeyId: string;
}

export interface JobStore {
  get(jobId: string): Promise<JobRecord | null>;
  upsert(record: JobRecord): Promise<void>;
  findByIdempotency(apiKeyId: string, idempotencyKey: string): Promise<JobRecord | null>;
}

export interface IdempotencyStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

export interface JobStateMachine {
  transition(
    record: JobRecord,
    to: JobState,
    payload?: { result?: unknown; error?: JobError }
  ): JobRecord;
}

export interface SseBridgeDeps {
  emitter: import("node:events").EventEmitter;
  onEvent: (event: string, data: unknown) => void;
  initialRecord?: JobRecord;
}

export interface SseBridge {
  attach(jobId: string): void;
  detach(): void;
}

export interface JobsAppDeps {
  store: JobStore;
  enqueue: (kind: JobKind, input: unknown, apiKeyId: string) => Promise<string>;
  idemStore?: IdempotencyStore;
  sseEmitter?: import("node:events").EventEmitter;
}
