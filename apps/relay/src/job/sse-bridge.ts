import type { CreateSseBridgeOpts, SseBridge } from "./types.ts";

export function createSseBridge(deps: CreateSseBridgeOpts): SseBridge {
  const { emitter, onEvent, initialRecord } = deps;
  let attachedJobId: string | null = null;

  function handleActive(payload: { jobId: string }) {
    if (payload.jobId !== attachedJobId) return;
    onEvent("progress", { progress: 0 });
  }

  function handleProgress(payload: { jobId: string; data: number }) {
    if (payload.jobId !== attachedJobId) return;
    onEvent("progress", { progress: payload.data });
  }

  function handleCompleted(payload: { jobId: string; returnvalue: unknown }) {
    if (payload.jobId !== attachedJobId) return;
    onEvent("succeeded", { result: payload.returnvalue });
  }

  function handleFailed(payload: {
    jobId: string;
    failedReason?: string;
    error?: { code: string; message: string };
  }) {
    if (payload.jobId !== attachedJobId) return;
    const error = payload.error ?? { code: "E_FAILED", message: payload.failedReason ?? "unknown" };
    onEvent("failed", { error });
  }

  return {
    attach(jobId: string) {
      attachedJobId = jobId;

      if (initialRecord) {
        if (initialRecord.state === "succeeded") {
          onEvent("succeeded", { result: initialRecord.result });
          return;
        }
        if (initialRecord.state === "failed") {
          onEvent("failed", { error: initialRecord.error });
          return;
        }
      }

      emitter.on("active", handleActive);
      emitter.on("progress", handleProgress);
      emitter.on("completed", handleCompleted);
      emitter.on("failed", handleFailed);
    },

    detach() {
      emitter.off("active", handleActive);
      emitter.off("progress", handleProgress);
      emitter.off("completed", handleCompleted);
      emitter.off("failed", handleFailed);
      attachedJobId = null;
    },
  };
}
