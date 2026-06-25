import { ref } from "vue";

export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface SseJobState {
  status: ReturnType<typeof ref<JobStatus>>;
  percent: ReturnType<typeof ref<number>>;
  result: ReturnType<typeof ref<unknown>>;
  error: ReturnType<typeof ref<{ code: string; message: string } | undefined>>;
}

export type EventSourceFactory = (url: string) => EventSource;

export function useSseJob(eventSourceFactory?: EventSourceFactory) {
  const status = ref<JobStatus>("queued");
  const percent = ref(0);
  const result = ref<unknown>(undefined);
  const error = ref<{ code: string; message: string } | undefined>(undefined);

  let es: EventSource | null = null;

  function start(jobId: string): void {
    stop();
    const factory = eventSourceFactory ?? ((url: string) => new EventSource(url));
    es = factory(`/api/v1/jobs/${jobId}/events`);

    es.addEventListener("progress", (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { progress: number };
      status.value = "running";
      percent.value = data.progress;
    });

    es.addEventListener("succeeded", (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { result: unknown };
      result.value = data.result;
      status.value = "completed";
      stop();
    });

    es.addEventListener("failed", (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { error: { code: string; message: string } };
      error.value = data.error;
      status.value = "failed";
      stop();
    });
  }

  function stop(): void {
    if (es) {
      es.close();
      es = null;
    }
  }

  return { status, percent, result, error, start, stop };
}
